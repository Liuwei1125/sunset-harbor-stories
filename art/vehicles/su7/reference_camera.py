"""Approximate pinhole camera fit to manually marked official-photo landmarks.

Pixel residuals describe camera alignment only, never the likeness of the car.
"""
import math,json
import numpy as np


def fit(v):
    width,height=2048,1152
    wheel_x=-.978
    marks=[
        ('front wheel centre',(wheel_x,1.55,.355),(943,789)),
        ('front tire top',(wheel_x,1.55,.710),(943,697)),
        ('front tire bottom',(wheel_x,1.55,0),(943,879)),
        ('rear wheel centre',(wheel_x,-1.45,.355),(1463,742)),
        ('rear tire top',(wheel_x,-1.45,.710),(1463,663)),
        ('rear tire bottom',(wheel_x,-1.45,0),(1463,819)),
        ('front plate centre',(0,2.497,.532),(567,742)),
        ('lidar centre',(0,.326,v.b.roof(.326)+.034),(1028,498)),
    ]
    points=np.array([m[1] for m in marks]);pixels=np.array([m[2] for m in marks])
    target=np.array([0.,0.,.74])
    def project(p):
        az,el,radius,lens,sx,sy=p
        eye=target+radius*np.array([-math.cos(az)*math.cos(el),math.sin(az)*math.cos(el),math.sin(el)])
        forward=(target-eye)/radius
        right=np.cross(forward,[0,0,1]);right/=np.linalg.norm(right)
        up=np.cross(right,forward)
        delta=points-eye;depth=delta@forward;focal=width*lens/36
        return np.column_stack((width*.5+focal*(delta@right)/depth-sx*width,height*.5-focal*(delta@up)/depth+sy*width))
    p=np.array([.79,.13,15.,65.,0.,.08])
    lo=np.array([.3,.025,7.,25.,-.4,-.4]);hi=np.array([1.25,.50,40.,160.,.4,.4])
    eps=np.array([.0001,.0001,.001,.01,.0001,.0001]);damping=.01
    for _ in range(180):
        residual=(project(p)-pixels).ravel()
        jac=np.column_stack([((project(p+np.eye(6)[i]*eps[i])-project(p))/eps[i]).ravel() for i in range(6)])
        matrix=jac.T@jac;step=np.linalg.solve(matrix+damping*np.diag(np.diag(matrix)+1),-jac.T@residual)
        candidate=np.clip(p+step,lo,hi)
        if np.sum((project(candidate)-pixels)**2)<residual@residual:p=candidate;damping=max(1e-7,damping*.55)
        else:damping=min(1e8,damping*4)
        if np.linalg.norm(step)<1e-8:break
    az,el,radius,lens,sx,sy=p
    eye=target+radius*np.array([-math.cos(az)*math.cos(el),math.sin(az)*math.cos(el),math.sin(el)])
    predicted=project(p)
    view={'eye':eye.tolist(),'target':target.tolist(),'lens':float(lens),'shift':[float(sx),float(sy)],'resolution':[width,height]}
    report={'reference':'references/6-1.png','view':view,'landmarks':[{'name':m[0],'world':list(m[1]),'referencePixel':list(m[2]),'projectedPixel':predicted[i].tolist()} for i,m in enumerate(marks)],
            'cameraLandmarkRmsPixels':float(np.sqrt(np.mean(np.sum((predicted-pixels)**2,axis=1)))),
            'limitations':'Manually marked landmarks and nominal dimensions; no lens distortion calibration or photogrammetry. Camera-fit error is not a vehicle-shape accuracy score.'}
    (v.OUT/'reference-camera-fit.json').write_text(json.dumps(report,indent=2)+'\n')
    print('REFERENCE CAMERA FIT',json.dumps(view),'LANDMARK RMS PIXELS',report['cameraLandmarkRmsPixels'],flush=True)
    return view


def lamp_trace(v):
    view=v.VIEWS['reference-front'];eye=np.array(view['eye']);target=np.array(view['target'])
    forward=target-eye;forward/=np.linalg.norm(forward)
    right=np.cross(forward,[0,0,1]);right/=np.linalg.norm(right);up=np.cross(right,forward)
    sx,sy=view['shift'];focal=2048*view['lens']/36
    pixels=[(678,724),(708,709),(768,689),(812,680),(832,679),(841,684),(842,695),(838,713),(830,724),(811,729),(773,732),(712,732),(686,729)]
    hits=[]
    from mathutils import Vector
    for px,py in pixels:
        nx=(px-1024+sx*2048)/focal;ny=-(py-576-sy*2048)/focal
        direction=forward+right*nx+up*ny;direction/=np.linalg.norm(direction)
        hit,normal,index,distance=v.BODY.ray_cast(Vector(eye),Vector(direction),40)
        if hit is None:raise RuntimeError('Reference lamp ray missed body at '+str((px,py)))
        hits.append((abs(float(hit.x)),float(hit.z)))
    # Internal construction coordinates follow the same three reference anchors.
    original=np.array([[.398,.642,1],[.850,.799,1],[.872,.642,1]])
    observed=np.array([hits[0],hits[4],hits[8]])
    transform=np.linalg.solve(original,observed)
    report={'reference':'references/6-1.png','pixels':pixels,'bodySurfaceXZ':hits,'internalAffineMap':transform.tolist(),
            'appliedPhotoAdjustmentWeight':.22,
            'note':'The unconstrained photo rays are diagnostic. Only 22 percent of the affine correction is applied to the authored shape; side-view and close-up constraints prevent excessive wrapping. Not measured CAD.'}
    (v.OUT/'headlamp-reference-trace.json').write_text(json.dumps(report,indent=2)+'\n')
    print('LAMP REFERENCE SURFACE XZ',hits,flush=True)
    return hits,lambda x,z:tuple(np.array([x,z,1])@transform)
