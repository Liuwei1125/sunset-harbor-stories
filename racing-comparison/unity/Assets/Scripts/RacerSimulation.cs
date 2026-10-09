using System;
using System.Collections.Generic;

namespace CoastRush
{
    [Serializable] public class Difficulty { public string name; public int traffic, target; public double speed; }
    [Serializable] public class Rules
    {
        public uint seed; public double duration, roadWidth, laneWidth, fixedStep, roadLength;
        public double maxSpeed, boostSpeed, acceleration, braking, drag, steerResponse;
        public double lateralDamping, lateralAcceleration, collisionHalfWidth, collisionHalfLength;
        public double nearMissWidth, collisionDamage; public double[] lanes; public Difficulty[] difficulties;
    }
    [Serializable] public class TrafficCar
    {
        public int id, lane, type, color; public double z, x, speed; public bool passed;
    }
    [Serializable] public class DriveInput { public double steer; public bool brake, boost; public bool throttle = true; }
    [Serializable] public class RaceEvent { public string text, kind; public double time; }
    // Pure C#: deliberately independent of UnityEngine and the frame/rendering rate.
    // Equations, update order and LCG are mirrored in shared/simulation.js.
    public sealed class RacerSimulation
    {
        public readonly Rules rules;
        public Difficulty mode;
        public int difficulty, score, combo, maxCombo, overtakes, nearMisses;
        public string phase = "ready", result = "";
        public double time, progress, x, vx, speed, steer, health, nitro, comboTime, hit, invincible, elapsed;
        public bool boosting;
        public List<TrafficCar> traffic = new List<TrafficCar>();
        public List<RaceEvent> events = new List<RaceEvent>();
        uint randomState; int benchmarkLane = 1;
        public RacerSimulation(Rules data) { rules = data; Reset(0); }
        public static double Clamp(double x, double a, double b) => Math.Max(a, Math.Min(b, x));
        public static double RoadX(double z) => 36 * Math.Sin(z / 410) + 18 * Math.Sin(z / 173);
        public static double RoadY(double z) => .7 * Math.Sin(z / 145) + 1.6 * Math.Sin(z / 640);
        public static double RoadDX(double z) => 36d / 410 * Math.Cos(z / 410) + 18d / 173 * Math.Cos(z / 173);
        public static double RoadDDX(double z) => -36d / (410 * 410) * Math.Sin(z / 410) - 18d / (173 * 173) * Math.Sin(z / 173);
        double Random() { randomState = unchecked(randomState * 1664525u + 1013904223u); return randomState / 4294967296d; }
        public void Reset(int level)
        {
            difficulty = Math.Max(0, Math.Min(2, level)); mode = rules.difficulties[difficulty]; randomState = rules.seed;
            phase = "ready"; result = ""; time = rules.duration; progress = 0; x = -1.8; vx = 0; speed = 28; steer = 0;
            health = nitro = 100; score = combo = maxCombo = overtakes = nearMisses = 0;
            comboTime = hit = invincible = elapsed = 0; boosting = false; benchmarkLane = 1; events.Clear(); traffic.Clear();
            for (int i = 0; i < mode.traffic; i++)
                traffic.Add(new TrafficCar { id = i, z = 70 + i * 38 + Random() * 17, lane = i % 4, x = rules.lanes[i % 4], speed = (17 + Random() * 13) * mode.speed, type = i % 5 == 0 ? 1 : 0, color = i % 5 });
        }
        public void Start() { Reset(difficulty); phase = "running"; }
        void Event(string text, string kind = "good")
        {
            events.Add(new RaceEvent { text = text, kind = kind, time = elapsed }); if (events.Count > 30) events.RemoveAt(0);
        }
        public void Step(double dt, DriveInput input)
        {
            if (phase != "running") return;
            var r = rules; elapsed += dt; time = Math.Max(0, r.duration - elapsed); hit = Math.Max(0, hit - dt * 2.8);
            invincible = Math.Max(0, invincible - dt); comboTime = Math.Max(0, comboTime - dt); if (comboTime == 0) combo = 0;
            double brake = input.brake ? 1 : 0, throttle = input.brake ? 0 : input.throttle ? 1 : 0;
            boosting = input.boost && nitro > 1 && speed > 12 && !input.brake;
            nitro = Clamp(nitro + dt * (boosting ? -25 : 5.5), 0, 100);
            double accel = throttle * (r.acceleration + (boosting ? 12 : 0)) - brake * r.braking - r.drag * speed * speed - (throttle > 0 ? 0 : 1.5);
            speed = Clamp(speed + accel * dt, 0, r.boostSpeed);
            if (!boosting && speed > r.maxSpeed) speed = Math.Max(r.maxSpeed, speed - 5 * dt);
            steer += (Clamp(input.steer, -1, 1) - steer) * Math.Min(1, dt * r.steerResponse);
            vx += (steer * r.lateralAcceleration * Math.Min(1, speed / 18) - vx * r.lateralDamping - RoadDDX(progress) * speed * speed) * dt;
            x += vx * dt; progress += speed * dt;
            if (Math.Abs(x) > 6.55)
            {
                x = Clamp(x, -6.55, 6.55); vx *= -.2;
                if (invincible == 0) { health = Math.Max(0, health - 6); speed *= .8; invincible = .7; hit = .35; combo = 0; Event("擦到护栏 · −6", "bad"); }
            }
            foreach (var car in traffic)
            {
                car.z += car.speed * dt; car.x = r.lanes[car.lane] + Math.Sin(elapsed * .45 + car.id * 1.7) * .12;
                double dz = car.z - progress, dx = Math.Abs(car.x - x);
                if (Math.Abs(dz) < r.collisionHalfLength && dx < r.collisionHalfWidth && invincible == 0)
                {
                    health = Math.Max(0, health - r.collisionDamage); speed *= .46; invincible = 1.5; hit = 1; combo = 0; vx += (x < car.x ? -1 : 1) * 3; Event("碰撞 · 连击中断", "bad");
                }
                if (dz < -5 && !car.passed)
                {
                    car.passed = true; overtakes++; score += 50;
                    if (dx < r.nearMissWidth && dx >= r.collisionHalfWidth && speed - car.speed > 5 && invincible == 0)
                    {
                        combo = Math.Min(8, combo + 1); maxCombo = Math.Max(maxCombo, combo); comboTime = 5; nearMisses++; nitro = Math.Min(100, nitro + 16); score += 250 * combo; Event("极限擦车 ×" + combo + "  +" + 250 * combo);
                    }
                    else if (invincible == 0) Event("超越 +50");
                }
                if (dz < -70) { car.z = progress + 620 + Random() * 280; car.lane = (int)(Random() * 4); car.speed = (17 + Random() * 13) * mode.speed; car.passed = false; }
            }
            if (health <= 0) { phase = "finished"; result = "车辆受损"; }
            else if (time <= 0) { phase = "finished"; result = progress >= mode.target ? "挑战完成" : "距离不足"; }
        }
        public DriveInput BenchmarkInput()
        {
            int target = benchmarkLane; bool changing = Math.Abs(rules.lanes[target] - x) > .38;
            if (!changing && Clearance(target).ttc < 4.2)
            {
                double best = Clearance(target).ttc;
                foreach (int candidate in new[] { target - 1, target + 1 })
                {
                    if (candidate < 0 || candidate > 3) continue; var gap = Clearance(candidate);
                    if (gap.ttc > 1.8 && gap.dist > 30 && gap.ttc - .8 > best) { best = gap.ttc - .8; benchmarkLane = candidate; }
                }
                target = benchmarkLane; changing = Math.Abs(rules.lanes[target] - x) > .38;
            }
            double danger = 20;
            foreach (var c in traffic) { double dz = c.z - progress; if (dz > -5 && Math.Abs(c.x - x) < 2) danger = Math.Min(danger, (dz - 7) / Math.Max(1, speed - c.speed)); }
            var targetGap = Clearance(target); double feedforward = RoadDDX(progress) * speed * speed / rules.lateralAcceleration;
            return new DriveInput { steer = Clamp((rules.lanes[target] - x) * 1.2 - vx * .4 + feedforward, -1, 1), boost = !changing && nitro > 30 && targetGap.dist > 180 && danger > 5, brake = danger < 1.6 || targetGap.ttc < 1.3 };
        }
        (double ttc, double dist) Clearance(int lane)
        {
            double ttc = 20, dist = 600;
            foreach (var c in traffic) { double dz = c.z - progress; if (Math.Abs(c.x - rules.lanes[lane]) < 1.8 && dz > -8) { ttc = Math.Min(ttc, (dz - 7) / Math.Max(1, speed - c.speed)); dist = Math.Min(dist, dz); } }
            return (ttc, dist);
        }
    }
}
