using System;
using System.IO;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;

namespace CoastRush.Editor
{
    public sealed class RacerTextureImporter : AssetPostprocessor
    {
        void OnPreprocessTexture()
        {
            if (!assetPath.StartsWith("Assets/Resources/Racer/textures/", StringComparison.Ordinal)) return;
            var importer = (TextureImporter)assetImporter; importer.mipmapEnabled = true; importer.anisoLevel = 8; importer.maxTextureSize = 1024;
            importer.wrapMode = TextureWrapMode.Repeat; importer.textureCompression = TextureImporterCompression.Uncompressed;
            if (assetPath.Contains("road-normal")) { importer.textureType = TextureImporterType.NormalMap; importer.sRGBTexture = false; }
            if (assetPath.Contains("sky-")) { importer.isReadable = true; importer.wrapMode = TextureWrapMode.Clamp; }
        }
    }
    public static class RacerBuild
    {
        [MenuItem("Coast Rush/Prepare scene")]
        public static void Prepare()
        {
            EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            Directory.CreateDirectory("Assets/Scenes");
            EditorSceneManager.SaveScene(EditorSceneManager.GetActiveScene(), "Assets/Scenes/Coast.unity");
            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene("Assets/Scenes/Coast.unity", true) };
            PlayerSettings.companyName = "Harbor Workshop"; PlayerSettings.productName = "Coast Rush";
            PlayerSettings.colorSpace = ColorSpace.Linear; PlayerSettings.defaultScreenWidth = 1280; PlayerSettings.defaultScreenHeight = 720;
            PlayerSettings.runInBackground = false; PlayerSettings.WebGL.template = "PROJECT:Coast";
            PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Gzip; PlayerSettings.WebGL.decompressionFallback = true;
            PlayerSettings.WebGL.dataCaching = true;
            PlayerSettings.SetUseDefaultGraphicsAPIs(BuildTarget.WebGL, false); PlayerSettings.SetGraphicsAPIs(BuildTarget.WebGL, new[] { GraphicsDeviceType.OpenGLES3 });
            PlayerSettings.SetScriptingBackend(NamedBuildTarget.WebGL, ScriptingImplementation.IL2CPP);
            PlayerSettings.stripEngineCode = true;
            // Assets referenced solely through Shader.Find must be included in a player build.
            var graphics = new SerializedObject(AssetDatabase.LoadAllAssetsAtPath("ProjectSettings/GraphicsSettings.asset")[0]);
            var array = graphics.FindProperty("m_AlwaysIncludedShaders");
            foreach (string name in new[] { "CoastRush/Surface", "Hidden/CoastRush/Finish", "Skybox/Cubemap", "GUI/Text Shader" })
            {
                var shader = Shader.Find(name); if (shader == null) throw new BuildFailedException("Missing shader: " + name);
                bool found = false; for (int i = 0; i < array.arraySize; i++) if (array.GetArrayElementAtIndex(i).objectReferenceValue == shader) found = true;
                if (!found) { int index = array.arraySize; array.InsertArrayElementAtIndex(index); array.GetArrayElementAtIndex(index).objectReferenceValue = shader; }
            }
            graphics.ApplyModifiedPropertiesWithoutUndo(); AssetDatabase.SaveAssets();
            Debug.Log("Coast Rush scene prepared. Press Play, or build WebGL from the Coast Rush menu.");
        }
        [MenuItem("Coast Rush/Build WebGL")]
        public static void BuildWebGL()
        {
            if (!BuildPipeline.IsBuildTargetSupported(BuildTargetGroup.WebGL, BuildTarget.WebGL))
                throw new BuildFailedException("Install Web Build Support for this Unity Editor in Unity Hub.");
            RacerConformance.Validate(); Prepare();
            string output = Path.GetFullPath(Path.Combine(Application.dataPath, "../../unity-webgl"));
            var report = BuildPipeline.BuildPlayer(new BuildPlayerOptions { scenes = new[] { "Assets/Scenes/Coast.unity" }, locationPathName = output, target = BuildTarget.WebGL, options = BuildOptions.None });
            if (report.summary.result != BuildResult.Succeeded) throw new BuildFailedException(report.summary.result.ToString());
            File.WriteAllText(Path.Combine(output, "build-status.json"), JsonUtility.ToJson(new BuildStatus { status = "built", engine = Application.unityVersion, bytes = report.summary.totalSize, builtAt = DateTime.UtcNow.ToString("O") }, true));
            Debug.Log("COAST_WEBGL_BUILD_SUCCESS " + output);
        }
        [Serializable] class BuildStatus { public string status, engine, builtAt; public ulong bytes; }
    }
}
