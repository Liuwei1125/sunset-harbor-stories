using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;
using Sim = CoastRush.RacerSimulation;

namespace CoastRush
{
    public sealed class RacerScene
    {
        public readonly Camera camera;
        public readonly Transform worldRoot;
        readonly Dictionary<string, Material> materials = new Dictionary<string, Material>();
        readonly Dictionary<string, ModelData> models = new Dictionary<string, ModelData>();
        readonly Dictionary<string, GameObject> carTemplates = new Dictionary<string, GameObject>();
        readonly List<(double z, GameObject root)> chunks = new List<(double, GameObject)>();
        readonly List<(double z, GameObject root)> scenery = new List<(double, GameObject)>();
        readonly List<GameObject> traffic = new List<GameObject>();
        readonly GameObject player, cockpit;
        readonly List<(Transform transform, string part)> gauges = new List<(Transform, string)>();
        public int cameraMode;
        public float fov = .98f;
        static Vector3 V(float[] a) => new Vector3(a[0], a[1], a[2]);
        static Vector3 V(double x, double y, double z) => new Vector3((float)x, (float)y, (float)z);

        public RacerScene()
        {
            worldRoot = new GameObject("Road and scenery").transform;
            camera = new GameObject("Driver camera").AddComponent<Camera>(); camera.tag = "MainCamera";
            camera.nearClipPlane = .035f; camera.farClipPlane = 750; camera.fieldOfView = .98f * Mathf.Rad2Deg;
            camera.allowHDR = true; camera.allowMSAA = true; camera.backgroundColor = new Color(.68f, .78f, .83f); camera.clearFlags = CameraClearFlags.Skybox;
            camera.gameObject.AddComponent<AudioListener>(); camera.gameObject.AddComponent<RacerPost>();
            RenderSettings.fog = true; RenderSettings.fogMode = FogMode.Linear; RenderSettings.fogStartDistance = 230; RenderSettings.fogEndDistance = 650; RenderSettings.fogColor = camera.backgroundColor;
            RenderSettings.ambientMode = AmbientMode.Trilight; RenderSettings.ambientSkyColor = new Color(.40f, .48f, .58f); RenderSettings.ambientEquatorColor = new Color(.28f, .30f, .27f); RenderSettings.ambientGroundColor = new Color(.10f, .10f, .07f);
            var sun = new GameObject("Coastal sunlight").AddComponent<Light>(); sun.type = LightType.Directional; sun.transform.rotation = Quaternion.LookRotation(new Vector3(.54f, -.72f, -.49f)); sun.color = new Color(1, .92f, .79f); sun.intensity = 2.9f; sun.shadows = LightShadows.Soft; sun.shadowBias = .04f; sun.shadowNormalBias = .2f; RenderSettings.sun = sun;
            QualitySettings.shadowDistance = 180; QualitySettings.shadowCascades = 2; QualitySettings.shadowResolution = ShadowResolution.High; QualitySettings.shadows = ShadowQuality.All; QualitySettings.antiAliasing = 2;
            SetSky(); MakeMaterials(); BuildRoad(); BuildScenery();
            var library = JsonUtility.FromJson<ModelLibrary>(Resources.Load<TextAsset>("Racer/models").text); foreach (var m in library.models) models.Add(m.name, m);
            player = MakeCar("comet-sport", "#b9d456", "Player"); player.transform.localScale = Vector3.one * .84f;
            cockpit = MakeCar("club-cockpit", "#b9d456", "Cockpit");
            Material("headliner", "#172027", .95f); Material("mirror", "#798792", .04f, 1);
            Box("roof lining", V(0, 1.48, -.27), V(1.42, .06, 1.65), "headliner", cockpit.transform);
            Box("windshield header", V(0, 1.455, .52), V(1.40, .055, .1), "headliner", cockpit.transform);
            Box("rear view mirror", V(.12, 1.30, .4), V(.25, .074, .045), "mirror", cockpit.transform);
        }
        void SetSky()
        {
            var faces = new[] { "px", "nx", "py", "ny", "pz", "nz" }; var cube = new Cubemap(256, TextureFormat.RGBA32, true);
            for (int i = 0; i < 6; i++) { var t = Resources.Load<Texture2D>("Racer/textures/sky-" + faces[i]); cube.SetPixels(t.GetPixels(), (CubemapFace)i); }
            cube.Apply(true, false); var sky = new Material(Shader.Find("Skybox/Cubemap")); sky.SetTexture("_Tex", cube); sky.SetFloat("_Exposure", 1f); RenderSettings.skybox = sky;
            RenderSettings.defaultReflectionMode = DefaultReflectionMode.Custom; RenderSettings.customReflectionTexture = cube; RenderSettings.reflectionIntensity = .65f;
        }
        Material Material(string name, string hex, float rough, float metal = 0, string texture = null)
        {
            var m = new Material(Shader.Find("CoastRush/Surface")); m.name = name; ColorUtility.TryParseHtmlString(hex, out Color color); m.SetColor("_Color", color); m.SetFloat("_Metallic", metal); m.SetFloat("_Glossiness", 1 - rough); m.enableInstancing = true;
            if (texture != null) m.mainTexture = Resources.Load<Texture2D>("Racer/textures/" + texture);
            materials[name] = m; return m;
        }
        void MakeMaterials()
        {
            var road = Material("road", "#ffffff", .92f, 0, "road"); road.SetTexture("_BumpMap", Resources.Load<Texture2D>("Racer/textures/road-normal")); road.SetFloat("_BumpScale", .28f);
            Material("grass", "#ffffff", 1, 0, "grass"); Material("rock", "#ffffff", .96f, 0, "rock"); Material("foliage", "#ffffff", 1); Material("bark", "#ffffff", 1);
            Material("rail", "#a7adb0", .44f, .63f); Material("post", "#77817d", .75f, .3f); Material("edge", "#aba794", .97f); Material("sign", "#285b44", .75f); Material("sea", "#3e7e91", .19f, .25f);
        }
        static void WhiteColors(Mesh mesh)
        {
            var colors = new Color[mesh.vertexCount]; for (int i = 0; i < colors.Length; i++) colors[i] = Color.white; mesh.colors = colors;
        }
        GameObject MeshObject(string name, Mesh mesh, Material material, Transform parent)
        {
            var go = new GameObject(name); go.transform.SetParent(parent, false); go.AddComponent<MeshFilter>().sharedMesh = mesh;
            var renderer = go.AddComponent<MeshRenderer>(); renderer.sharedMaterial = material; renderer.receiveShadows = true; renderer.shadowCastingMode = ShadowCastingMode.On; return go;
        }
        GameObject Box(string name, Vector3 p, Vector3 size, string mat, Transform parent, bool shadow = false)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Cube); go.name = name; UnityEngine.Object.Destroy(go.GetComponent<Collider>());
            go.transform.SetParent(parent, false); go.transform.localPosition = p; go.transform.localScale = size;
            var mr = go.GetComponent<MeshRenderer>(); mr.sharedMaterial = materials[mat]; mr.shadowCastingMode = shadow ? ShadowCastingMode.On : ShadowCastingMode.Off;
            // Built-in primitive meshes have no vertex colors; the shader's default is white.
            return go;
        }
        Mesh Ribbon(double z0, double z1, double[] xs, bool terrain)
        {
            var positions = new List<Vector3>(); var uv = new List<Vector2>(); var triangles = new List<int>(); const int steps = 20;
            for (int i = 0; i <= steps; i++) for (int j = 0; j < xs.Length; j++)
            {
                double z = z0 + (z1 - z0) * i / steps, x = xs[j], offset = terrain ? -.06 + Math.Max(0, Math.Abs(x) - 9) * .065 + Math.Sin(z / 34 + x * .15) * Math.Max(0, Math.Abs(x) - 12) * .023 : 0;
                positions.Add(V(Sim.RoadX(z) + x, Sim.RoadY(z) + offset, z)); uv.Add(new Vector2((float)(terrain ? x / 14 : (x + 7.7) / 15.4), (float)(terrain ? z / 14 : z / 12)));
                if (i < steps && j < xs.Length - 1) { int a = i * xs.Length + j, b = a + xs.Length; triangles.AddRange(new[] { a, b, a + 1, a + 1, b, b + 1 }); }
            }
            var mesh = new Mesh { name = terrain ? "ground strip" : "road strip" }; mesh.SetVertices(positions); mesh.SetUVs(0, uv); mesh.SetTriangles(triangles, 0); mesh.RecalculateNormals(); mesh.RecalculateTangents(); mesh.RecalculateBounds(); WhiteColors(mesh); return mesh;
        }
        void BuildRoad()
        {
            for (int z = -100; z < 8000; z += 100)
            {
                var root = new GameObject("Section " + z); root.transform.SetParent(worldRoot, false);
                MeshObject("Asphalt", Ribbon(z, z + 100, new[] { -7.7, 7.7 }, false), materials["road"], root.transform).GetComponent<MeshRenderer>().shadowCastingMode = ShadowCastingMode.Off;
                MeshObject("Terrain", Ribbon(z, z + 100, new[] { -140d, -90, -45, -20, -10, -7.8, 7.8, 10, 20, 45, 90, 140 }, true), materials["grass"], root.transform).GetComponent<MeshRenderer>().shadowCastingMode = ShadowCastingMode.Off;
                foreach (int side in new[] { -1, 1 }) for (int dz = 0; dz < 100; dz += 10)
                {
                    double s = z + dz + 5, x = Sim.RoadX(s) + side * 8.2, y = Sim.RoadY(s); float yaw = (float)Math.Atan(Sim.RoadDX(s)) * Mathf.Rad2Deg;
                    var rail = Box("steel barrier", V(x, y + .68, s), V(.10, .30, 10.15), "rail", root.transform, true); rail.transform.localRotation = Quaternion.Euler(0, yaw, 0);
                    var edge = Box("curb", V(x - side * .17, y + .035, s), V(.30, .10, 10.16), "edge", root.transform); edge.transform.localRotation = Quaternion.Euler(0, yaw, 0);
                    Box("rail post", V(x, y + .3, s), V(.14, .8, .13), "post", root.transform, true);
                    if (dz % 20 == 0) Box("reflector", V(x - side * .073, y + .7, s), V(.014, .09, .13), "edge", root.transform);
                }
                if (z > 0 && z % 600 == 0)
                {
                    Box("sign post", V(Sim.RoadX(z) - 10, Sim.RoadY(z) + 2.5, z), V(.12, 5, .12), "rail", root.transform, true);
                    Box("coast route", V(Sim.RoadX(z) - 10, Sim.RoadY(z) + 4.5, z), V(3, 1.4, .08), "sign", root.transform);
                    var label = new GameObject("Route label"); label.transform.SetParent(root.transform, false); label.transform.localPosition = V(Sim.RoadX(z) - 10, Sim.RoadY(z) + 4.5, z - .05); label.transform.localRotation = Quaternion.Euler(0, 180, 0);
                    var text = label.AddComponent<TextMesh>(); text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf"); label.GetComponent<MeshRenderer>().sharedMaterial = text.font.material; text.text = "COAST 01\nNORTH  " + (8 - z / 1000f).ToString("0.0") + " km"; text.fontSize = 48; text.characterSize = .065f; text.anchor = TextAnchor.MiddleCenter; text.alignment = TextAlignment.Center; text.color = new Color(.94f, .94f, .84f);
                }
                chunks.Add((z, root));
            }
            Box("Pacific ocean", V(-1040, -5, 4000), V(1900, .02, 10000), "sea", worldRoot);
        }
        void BuildScenery()
        {
            var data = JsonUtility.FromJson<WorldData>(Resources.Load<TextAsset>("Racer/world").text);
            var meshes = new Dictionary<string, Mesh>(); var mats = new Dictionary<string, string>();
            foreach (var g in data.meshes)
            {
                // Babylon's custom mesh winding is reversed relative to Unity's rasterizer.
                for (int i = 0; i < g.indices.Length; i += 3) { int t = g.indices[i + 1]; g.indices[i + 1] = g.indices[i + 2]; g.indices[i + 2] = t; }
                var mesh = g.CreateMesh(); mesh.RecalculateTangents(); meshes[g.name] = mesh; mats[g.name] = g.material;
            }
            foreach (var p in data.objects)
            {
                var go = MeshObject(p.mesh, meshes[p.mesh], materials[mats[p.mesh]], worldRoot); go.transform.localPosition = V(p.position); go.transform.localScale = V(p.scale); go.transform.localRotation = Quaternion.Euler(0, p.yaw * Mathf.Rad2Deg, 0); scenery.Add((p.position[2], go));
            }
        }
        GameObject MakeCar(string id, string paint, string name)
        {
            string key = id + paint;
            if (id != "club-cockpit" && carTemplates.TryGetValue(key, out var template)) { var copy = UnityEngine.Object.Instantiate(template); copy.name = name; return copy; }
            var root = new GameObject(name); ColorUtility.TryParseHtmlString(paint, out Color paintColor);
            foreach (var p in models[id].parts)
            {
                var bytes = Convert.FromBase64String(p.vertices); var ib = Convert.FromBase64String(p.indices); int count = bytes.Length / 12; var vertices = new Vector3[count]; var normals = new Vector3[count]; var uv = new Vector2[count]; var indices = new int[ib.Length / 2];
                Vector3 pivot = new Vector3(p.pivot[0], p.pivot[1], -p.pivot[2]); bool animate = p.part == "steering" || p.part.EndsWith("needle");
                for (int i = 0; i < count; i++)
                {
                    int n = i * 12; vertices[i] = new Vector3(BitConverter.ToInt16(bytes, n) * .001f, BitConverter.ToInt16(bytes, n + 2) * .001f, -BitConverter.ToInt16(bytes, n + 4) * .001f) + pivot;
                    if (animate) vertices[i] -= pivot;
                    normals[i] = new Vector3(BitConverter.ToInt16(bytes, n + 6) / 32767f, BitConverter.ToInt16(bytes, n + 8) / 32767f, -BitConverter.ToInt16(bytes, n + 10) / 32767f); uv[i] = new Vector2(vertices[i].x, -vertices[i].z);
                }
                for (int i = 0; i < indices.Length; i++) indices[i] = BitConverter.ToUInt16(ib, i * 2);
                for (int i = 0; i < indices.Length; i += 3) { int t = indices[i + 1]; indices[i + 1] = indices[i + 2]; indices[i + 2] = t; }
                var mesh = new Mesh { name = name + "/" + p.part, vertices = vertices, normals = normals, uv = uv, triangles = indices }; mesh.RecalculateTangents(); mesh.RecalculateBounds(); WhiteColors(mesh);
                var mat = new Material(Shader.Find("CoastRush/Surface")); mat.enableInstancing = true;
                Color color = p.paint ? paintColor : new Color(p.color[0], p.color[1], p.color[2]); mat.SetColor("_Color", color); mat.SetFloat("_Metallic", p.paint ? .65f : p.metallic); mat.SetFloat("_Glossiness", 1 - (p.paint ? .23f : p.roughness));
                if (p.roughness < .2f) { mat.SetColor("_Color", new Color(.035f, .065f, .085f)); mat.SetFloat("_Metallic", .5f); mat.SetFloat("_Glossiness", .89f); }
                if (p.emissive) { mat.SetColor("_Color", Color.black); mat.SetColor("_EmissionColor", color * 1.6f); }
                var go = MeshObject(mesh.name, mesh, mat, root.transform);
                if (animate) { go.transform.localPosition = pivot; gauges.Add((go.transform, p.part)); }
            }
            if (id != "club-cockpit") carTemplates[key] = root;
            return root;
        }
        public void SetQuality(bool high) { QualitySettings.shadowDistance = high ? 180 : 100; QualitySettings.antiAliasing = high ? 2 : 0; camera.GetComponent<RacerPost>().bloom = high; }
        public void Render(Sim s, float dt)
        {
            double z = s.progress, cx = Sim.RoadX(z), cy = Sim.RoadY(z), yaw = Math.Atan(Sim.RoadDX(z)), slope = Math.Atan((Sim.RoadY(z + 1) - Sim.RoadY(z - 1)) * .5);
            worldRoot.localPosition = V(-cx, -cy, -z);
            foreach (var c in chunks) { bool on = c.z > z - 150 && c.z < z + 750; if (c.root.activeSelf != on) c.root.SetActive(on); }
            foreach (var c in scenery) { bool on = c.z > z - 100 && c.z < z + 680; if (c.root.activeSelf != on) c.root.SetActive(on); }
            string[] colors = { "#a5bd53", "#bfd0df", "#ba4934", "#d9d4c5", "#3f687e" };
            for (int i = 0; i < s.traffic.Count; i++)
            {
                var c = s.traffic[i]; if (traffic.Count <= i) { var go = MakeCar(c.type == 1 ? "trail-jeep" : "comet-sport", colors[c.color], "Traffic " + i); go.transform.localScale = Vector3.one * (c.type == 1 ? .8f : .84f); traffic.Add(go); }
                var root = traffic[i]; root.SetActive(c.z - z < 680 && c.z - z > -80); root.transform.position = V(Sim.RoadX(c.z) + c.x - cx, Sim.RoadY(c.z) - cy, c.z - z); root.transform.rotation = Quaternion.Euler(0, (float)Math.Atan(Sim.RoadDX(c.z)) * Mathf.Rad2Deg, 0);
            }
            for (int i = s.traffic.Count; i < traffic.Count; i++) traffic[i].SetActive(false);
            double bodyYaw = yaw + s.vx * .015, lean = -s.steer * .035 * (s.speed / 45), bob = Math.Sin(z * 1.1) * .004 * Math.Min(1, s.speed / 40), shake = s.hit * Math.Sin(Time.realtimeSinceStartup * 100) * .027;
            player.transform.position = V(s.x, .01 + bob, 0); player.transform.rotation = Quaternion.Euler((float)-slope * Mathf.Rad2Deg, (float)bodyYaw * Mathf.Rad2Deg, (float)lean * Mathf.Rad2Deg); cockpit.transform.SetPositionAndRotation(player.transform.position, player.transform.rotation);
            player.SetActive(cameraMode != 0); cockpit.SetActive(cameraMode == 0);
            foreach (var g in gauges) g.transform.localRotation = Quaternion.Euler(0, 0, (float)(g.part == "steering" ? -s.steer * .65 : 2.2 - s.speed / 77 * 4.4) * Mathf.Rad2Deg);
            Vector3 pos, target;
            if (cameraMode == 2) { pos = V(s.x - Math.Sin(yaw) * 7, 3.3, -7); target = V(s.x + Math.Sin(bodyYaw) * 12, 1.1, 12); }
            else if (cameraMode == 1) { pos = V(s.x, 1.22, 1.15); target = V(s.x + Math.Sin(bodyYaw) * 35, 1.15 + slope * 35, 36); }
            else { pos = V(s.x - .37 * Math.Cos(bodyYaw) - .82 * Math.Sin(bodyYaw) + shake, 1.17 + bob, -.82 * Math.Cos(bodyYaw) + .37 * Math.Sin(bodyYaw)); target = pos + V(Math.Sin(bodyYaw) * 40, -.075 + slope * 40, Math.Cos(bodyYaw) * 40); }
            camera.transform.position = pos; camera.transform.rotation = Quaternion.LookRotation(target - pos) * Quaternion.Euler(0, 0, (float)(lean * .55 + shake) * Mathf.Rad2Deg);
            fov += (float)(.98 + Sim.Clamp((s.speed - 30) / 220, 0, .22) + (s.boosting ? .04 : 0) - fov) * Math.Min(1, dt * 4); camera.fieldOfView = fov * Mathf.Rad2Deg;
        }
    }
}
