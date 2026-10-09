using System;
using UnityEngine;

namespace CoastRush
{
    [Serializable] public class ModelLibrary { public ModelData[] models; }
    [Serializable] public class ModelData { public string name; public PartData[] parts; }
    [Serializable] public class PartData
    {
        public string part, vertices, indices; public float[] pivot, color;
        public float roughness, metallic; public bool emissive, paint;
    }
    [Serializable] public class WorldData { public MeshData[] meshes; public Placement[] objects; }
    [Serializable] public class MeshData
    {
        public string name, material; public float[] positions, normals, uvs, colors; public int[] indices;
        public Mesh CreateMesh()
        {
            int count = positions.Length / 3; var p = new Vector3[count]; var n = new Vector3[count]; var uv = new Vector2[count]; var c = new Color[count];
            for (int i = 0; i < count; i++)
            {
                p[i] = new Vector3(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
                n[i] = new Vector3(normals[i * 3], normals[i * 3 + 1], normals[i * 3 + 2]);
                uv[i] = new Vector2(uvs[i * 2], uvs[i * 2 + 1]);
                c[i] = new Color(colors[i * 4], colors[i * 4 + 1], colors[i * 4 + 2], colors[i * 4 + 3]);
            }
            var mesh = new Mesh { name = name, vertices = p, normals = n, uv = uv, colors = c, triangles = indices };
            mesh.RecalculateBounds(); return mesh;
        }
    }
    [Serializable] public class Placement { public string mesh; public float[] position, scale; public float yaw; }
    [Serializable] public class HudState
    {
        public string phase, result, eventText, eventKind; public int difficulty, target, score, combo, maxCombo, overtakes, nearMisses, camera;
        public double time, progress, x, speed, health, nitro, elapsed, hit, eventTime;
        public bool boosting, paused, benchmark; public float fps; public int width, height, samples;
        public double averageFps, p95FrameMs;
    }
}
