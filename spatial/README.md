# 水果忍者空间试玩版

原生 SDK6.1.9 Stage APK，已实现三维球形水果、飞行、双手关节轨迹命中、空间点选切割、碎片、计分及两侧操作面板。进入后自动开始禅模式；右侧可选择经典/街机/禅、暂停和重新开始。

模拟器真实摄像头手势：eye-hand 模式，Settings → Labs → Hand Tracking。需要用户允许摄像头并把手放入画面。尚未实测真实双手切割。

验证：assembleDebug、6项游戏单元测试通过。已安装到 emulator-5554，场景挂载日志已确认。普通截图仅返回系统房间，空间截图参数不受该模拟器支持；已通过宿主系统鼠标在 PICO 原生模拟器 Eye Gesture Mode 点中水果：2026-10-29 16:14:04 日志 score=0->1，窗口截图显示得分1，证据位于 .scratch/evidence/。这仅证明鼠标点切，未证明按住鼠标划切或真实双手追踪。

当前限制：水果现有烘焙纹理；西瓜含条纹、红色果肉和种子，橙子和苹果含对应切面；切开为半球网格。仍未完整还原原版六种水果、叶梗与刀光。没有音效、刀光、持久最高分；尚未完成设计还原和分层架构检查。网页设计仅留作参考，APK不使用网页或WebView。

源码：content/HomeStage.kt 为场景与面板；domain/usecase/GameEngine.kt 为玩法；GameEngineTest.kt 为规则测试。
构建：使用JDK21运行 ./gradlew assembleDebug testDebugUnitTest。
APK：app/build/outputs/apk/debug/app-debug.apk。

历史官方3D工作流仍失败（Schema unsupported）；按用户后续原生试玩请求推进SDK实现，未伪造官方工作流通过状态。

点切验证日志：FruitDojo / POINTER_SLICE，记录 id 与 score 前后值。已在用户授权系统鼠标后实测通过。修复了慢帧自动暂停（现在限制单帧追赶时间）以及启动初期 HMD 原点尚未稳定时过早定位（等待2秒后校准）。
