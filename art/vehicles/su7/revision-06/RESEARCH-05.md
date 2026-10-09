# SU7 第五版：复原方法与执行记录

检索日期：2026-09-18。下面是本轮实际阅读的原始资料，以及对当前模型采用的做法。没有购买课程，也没有取得厂家 CAD 或第三方车辆源模型。

## 原始资料

1. [Autodesk 汽车 Class-A 曲面教程](https://www.autodesk.com/campaigns/alias-automotive-tutorials)：先拟合主曲线、规划主曲面，再处理轮拱、机盖边缘和灯壳。应用：车身外壳在开孔前进行曲面细分，保留连续的法线参考；灯组和轮辐作为独立结构制作。
2. [Autodesk：理解 Class-A 建模](https://help.autodesk.com/cloudhelp/2016/KOR/Alias-Tutorials-Legacy/files/GUID-64611955-D2CC-44F2-98F0-D4F1FE931D8B.htm)：连续性、反射、装配间隙都属于表面质量，不能只看单张展示图。应用：保留灰模、前后视角及窄条灯检查。本模型没有按厂商容差认证，不能称为 Class-A 数据。
3. [Autodesk：反射检查教程索引](https://damassets.autodesk.net/content/dam/autodesk/files/alias-training/A2.9b_Index.pdf)：区分条纹、光隧道和曲率检查；单一条纹模式不足以判断真实高光。应用：使用实际灯光和环境反射检查，同时观察灰模；不把一张条纹图当作完整验收。
4. [Blender：Shrinkwrap](https://docs.blender.org/manual/en/4.2/modeling/modifiers/deform/shrinkwrap.html)：网格可沿指定方向或曲面法线贴合另一个表面。应用：灯罩、分缝、传感器等通过车身网格定位；减面后的法线按零件分别恢复，避免采到相邻饰条。
5. [Blender：Subdivision Surface](https://docs.blender.org/manual/en/3.6/modeling/modifiers/generate/subdivision_surface.html)：曲面细分改变实际几何，平滑着色只改变显示；拓扑和修改器顺序影响结果。应用：先平顺主曲面再开孔；轮辐与内嵌饰面先三角化、细分，再共同映射到轮毂凹面，避免非共面大多边形互相穿插。
6. [Jonathan Lampel：良好拓扑指南](https://blog.cgcookie.com/posts/the-art-of-good-topology-blender/)：网格应服务于形状与用途，把局部细节留在需要的位置。应用：外观精度优先，保留独立可编辑零件；网页轻量导出作为另一个用途，不限制 Blender 源文件的细节预算。
7. [Blender：相机参考图设置](https://docs.blender.org/api/main/bpy.types.CameraBackgroundImage.html)：参考图支持前景叠加与透明度。应用：基于官方图的人工轮心、轮胎边缘等标记拟合一个近似相机，提供同框叠加检查。

## 当前模型需要解决的问题

- 第四版车侧截面过于平均，门板反射缺少层次；第五版调整腰部内收与肩部凸起。
- 原来的门缝主要是曲线，缺少开槽深度；本轮改为实际布尔凹槽与槽内暗线。
- 灯组只有浅层外观；本轮增加反射碗、凸透镜、抛光边缘、导光条细纹及有厚度的透明外罩。
- 轮毂黑色内嵌面与弯曲轮辐不共面，第一轮草稿发现穿插；按同一曲面重新细分映射。还查出新建 BMesh 面未更新法线就进行三角化，会错误填住凹口；更新法线后再三角化，并比较面片面积与原始多边形面积，防止重复面。
- 前侧叠加显示原灯组边界偏离照片；以人工描出的灯组边缘作投射诊断，再结合侧面和近照约束做有限修正。直接采用单张照片的全部投射量会使外端包裹过深，因此记录原始投射数据但只应用 22% 的仿射修正。车尾角部按叠加图收拢，保留轴距和最大车宽约束。
- 大灯和车轮都不能只在整车缩略图中通过，本轮另外检查近景。

## 检查边界

参考相机来自人工标记和名义尺寸；标记位置、镜头畸变、车型配置和光照都有不确定性。`reference-camera-fit.json` 中的像素残差只是所选相机标记的拟合误差，不是整车还原度，也不能换算成相似度百分比。

座舱暂时沿用已有近似结构。模型仍需要依据更多实车细节继续校准。所有参考照片仅用于本机查看，未嵌入 GLB，也未发布到公网。
