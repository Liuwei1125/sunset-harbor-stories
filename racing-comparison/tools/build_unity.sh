#!/bin/zsh
set -eu
comparison_dir="$(cd "$(dirname "$0")/.." && pwd)"
unity_editor="${UNITY_EDITOR:-}"
if [[ -z "$unity_editor" ]]; then
  for candidate in /Applications/Unity/Hub/Editor/*/Unity.app/Contents/MacOS/Unity(N) "$HOME"/Applications/Unity/Hub/Editor/*/Unity.app/Contents/MacOS/Unity(N); do
    unity_editor="$candidate"
  done
fi
if [[ -z "$unity_editor" || ! -x "$unity_editor" ]]; then
  print -u2 '未找到 Unity 编辑器。安装 Unity 6 + Web Build Support，并在 Unity Hub 激活许可证。'
  print -u2 '或指定：UNITY_EDITOR=/完整路径/Unity.app/Contents/MacOS/Unity zsh tools/build_unity.sh'
  exit 2
fi
python3 "$comparison_dir/tools/prepare_unity_template.py"
node "$comparison_dir/tools/build_conformance.mjs"
"$unity_editor" -batchmode -quit -projectPath "$comparison_dir/unity" -buildTarget WebGL -executeMethod CoastRush.Editor.RacerBuild.BuildWebGL -logFile "$comparison_dir/verification/unity-build.log"
python3 "$comparison_dir/tools/verify_unity_build.py"
