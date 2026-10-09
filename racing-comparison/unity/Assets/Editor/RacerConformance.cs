using System;
using System.IO;
using UnityEditor;
using UnityEditor.Build;
using UnityEngine;
namespace CoastRush.Editor
{
    public static class RacerConformance
    {
        [Serializable] class Suite { public Case[] cases; }
        [Serializable] class Case { public int difficulty; public Sample[] samples; }
        [Serializable] class Sample
        {
            public int tick, score, overtakes, nearMisses, combo; public string phase;
            public double elapsed, progress, x, speed, health, nitro;
        }
        [MenuItem("Coast Rush/Validate simulation parity")]
        public static void Validate()
        {
            var rules = JsonUtility.FromJson<Rules>(Resources.Load<TextAsset>("Racer/rules").text);
            var suite = JsonUtility.FromJson<Suite>(File.ReadAllText("Assets/Editor/simulation-conformance.json")); int checkedSamples = 0;
            foreach (var c in suite.cases)
            {
                var sim = new RacerSimulation(rules); sim.Reset(c.difficulty); sim.Start(); int tick = 0;
                foreach (var sample in c.samples)
                {
                    while (tick < sample.tick) { sim.Step(rules.fixedStep, sim.BenchmarkInput()); tick++; }
                    Near(sim.progress, sample.progress, "progress"); Near(sim.x, sample.x, "x"); Near(sim.speed, sample.speed, "speed"); Near(sim.elapsed, sample.elapsed, "elapsed"); Near(sim.health, sample.health, "health"); Near(sim.nitro, sample.nitro, "nitro");
                    if (sim.score != sample.score || sim.overtakes != sample.overtakes || sim.nearMisses != sample.nearMisses || sim.combo != sample.combo || sim.phase != sample.phase)
                        throw new BuildFailedException("C#/JS state mismatch at difficulty " + c.difficulty + " tick " + tick);
                    checkedSamples++;
                }
            }
            Debug.Log("COAST_SIMULATION_PARITY_PASS " + checkedSamples + " checkpoints");
        }
        static void Near(double actual, double expected, string field)
        {
            if (double.IsNaN(actual) || Math.Abs(actual - expected) > .00001)
                throw new BuildFailedException("C#/JS mismatch in " + field + ": " + actual + " vs " + expected);
        }
    }
}
