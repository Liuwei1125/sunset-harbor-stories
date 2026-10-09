using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using UnityEngine;

namespace CoastRush
{
    public sealed class RacerController : MonoBehaviour
    {
        RacerSimulation sim; RacerScene scene; DriveInput input = new DriveInput();
        bool paused, benchmark, webInput; double accumulator; float hudTimer, averageFrame = .0167f;
        readonly HudState state = new HudState(); readonly List<double> frames = new List<double>(); bool statsCalculated;
        #if UNITY_WEBGL && !UNITY_EDITOR
        [DllImport("__Internal")] static extern void CoastReady();
        [DllImport("__Internal")] static extern void CoastState(string json);
        #endif
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        static void Boot()
        {
            if (FindFirstObjectByType<RacerController>() != null) return;
            var main = Camera.main; if (main != null) Destroy(main.gameObject);
            new GameObject("Racer").AddComponent<RacerController>();
        }
        void Start()
        {
            gameObject.name = "Racer"; Application.targetFrameRate = 60; QualitySettings.vSyncCount = 0;
            sim = new RacerSimulation(JsonUtility.FromJson<Rules>(Resources.Load<TextAsset>("Racer/rules").text)); scene = new RacerScene(); scene.Render(sim, 0);
            #if UNITY_WEBGL && !UNITY_EDITOR
            WebGLInput.captureAllKeyboardInput = false; CoastReady();
            #endif
        }
        public void StartRace(string unused) { sim.Start(); paused = false; accumulator = 0; input = new DriveInput(); frames.Clear(); statsCalculated = false; state.samples = 0; state.averageFps = state.p95FrameMs = 0; }
        public void SetDifficulty(string level) { if (int.TryParse(level, out int value)) { sim.Reset(value); paused = false; } }
        public void SetInput(string json) { input = JsonUtility.FromJson<DriveInput>(json); webInput = true; }
        public void SetPaused(string value) { paused = value == "1"; accumulator = 0; input = new DriveInput(); }
        public void SetCamera(string value) { if (int.TryParse(value, out int c)) scene.cameraMode = Math.Clamp(c, 0, 2); }
        public void SetQuality(string value) { scene.SetQuality(value == "high"); }
        public void SetBenchmark(string value) { benchmark = value == "1"; }
        void Update()
        {
            if (sim == null) return;
            float raw = Time.unscaledDeltaTime, dt = Math.Min(.05f, raw); averageFrame = Mathf.Lerp(averageFrame, raw, .04f);
            if (!webInput)
            {
                input.steer = (Input.GetKey(KeyCode.D) || Input.GetKey(KeyCode.RightArrow) ? 1 : 0) - (Input.GetKey(KeyCode.A) || Input.GetKey(KeyCode.LeftArrow) ? 1 : 0);
                input.brake = Input.GetKey(KeyCode.S) || Input.GetKey(KeyCode.DownArrow); input.boost = Input.GetKey(KeyCode.Space);
                if (Input.GetKeyDown(KeyCode.R)) StartRace(""); if (Input.GetKeyDown(KeyCode.C)) scene.cameraMode = (scene.cameraMode + 1) % 3;
                if (Input.GetKeyDown(KeyCode.Escape)) { paused = !paused; accumulator = 0; }
                if (Input.GetKeyDown(KeyCode.Return) && sim.phase != "running") StartRace("");
            }
            if (sim.phase == "running" && !paused)
            {
                accumulator += dt;
                while (accumulator >= sim.rules.fixedStep) { sim.Step(sim.rules.fixedStep, benchmark ? sim.BenchmarkInput() : input); accumulator -= sim.rules.fixedStep; }
                if (sim.elapsed > 3) frames.Add(raw * 1000d);
            }
            if (sim.phase == "finished" && !statsCalculated && frames.Count > 0)
            {
                statsCalculated = true; var sorted = new List<double>(frames); sorted.Sort(); double total = 0; foreach (double ms in frames) total += ms;
                state.samples = frames.Count; state.averageFps = 1000d * frames.Count / total; state.p95FrameMs = sorted[(int)(sorted.Count * .95)];
            }
            scene.Render(sim, dt); hudTimer += raw;
            if (hudTimer >= .05f) { hudTimer = 0; PushState(); }
        }
        void OnApplicationFocus(bool focus)
        {
            #if !UNITY_WEBGL || UNITY_EDITOR
            if (!focus && sim != null && sim.phase == "running") { paused = true; accumulator = 0; input = new DriveInput(); }
            #endif
            // The browser shell owns focus/visibility pausing in WebGL; HTML buttons must remain usable.
        }
        void PushState()
        {
            state.phase = sim.phase; state.result = sim.result; state.difficulty = sim.difficulty; state.target = sim.mode.target;
            state.time = sim.time; state.progress = sim.progress; state.x = sim.x; state.speed = sim.speed; state.health = sim.health; state.nitro = sim.nitro; state.elapsed = sim.elapsed;
            state.score = sim.score; state.combo = sim.combo; state.maxCombo = sim.maxCombo; state.overtakes = sim.overtakes; state.nearMisses = sim.nearMisses; state.hit = sim.hit;
            state.boosting = sim.boosting; state.paused = paused; state.benchmark = benchmark; state.camera = scene.cameraMode; state.fps = 1 / Math.Max(.001f, averageFrame); state.width = Screen.width; state.height = Screen.height;
            var e = sim.events.Count > 0 ? sim.events[sim.events.Count - 1] : null; state.eventText = e?.text ?? ""; state.eventKind = e?.kind ?? ""; state.eventTime = e?.time ?? 0;
            #if UNITY_WEBGL && !UNITY_EDITOR
            CoastState(JsonUtility.ToJson(state));
            #endif
        }
        // The Editor can play the project without its browser shell.
        #if !UNITY_WEBGL || UNITY_EDITOR
        void OnGUI()
        {
            if (sim == null) return;
            float scale = Screen.width / 1280f; GUI.matrix = Matrix4x4.Scale(new Vector3(scale, scale, 1));
            var title = new GUIStyle(GUI.skin.label) { fontSize = 24, fontStyle = FontStyle.Bold };
            var body = new GUIStyle(GUI.skin.label) { fontSize = 16 }; title.normal.textColor = new Color(.91f, 1, .55f);
            GUI.Label(new Rect(25, 22, 500, 40), "COAST / RUSH · UNITY WEBGL", title);
            GUI.Label(new Rect(25, 72, 900, 36), $"{sim.speed * 3.6:0} km/h     {sim.progress:0}/{sim.mode.target} m     {sim.time:0}s     HP {sim.health:0}     N₂O {sim.nitro:0}     SCORE {sim.score}", body);
            GUI.Label(new Rect(25, 110, 900, 36), "A/D steer · S brake · Space boost · C camera · R retry · Esc pause", body);
            if (sim.phase != "running" || paused)
            {
                GUI.Box(new Rect(35, 180, 360, 275), "COASTAL HIGHWAY / 01");
                GUI.Label(new Rect(55, 220, 340, 45), paused ? "PAUSED" : sim.phase == "finished" ? "RUN COMPLETE" : "CHASE THE WIND", title);
                for (int i = 0; i < 3; i++) if (GUI.Button(new Rect(55 + i * 106, 290, 98, 45), new[] { "CRUISE", "RUSH", "EXTREME" }[i])) SetDifficulty(i.ToString());
                if (GUI.Button(new Rect(55, 365, 310, 55), paused ? "RESUME" : "START / RETRY")) { if (paused) paused = false; else StartRace(""); }
            }
        }
        #endif
    }
}
