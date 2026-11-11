# Project status and continuation

Read README.md and .scratch/design-spec.json first. This is now an SDK6.1.9 native prototype. Read README for implemented behavior and unresolved runtime validation.
Application ID com.example.fruitninjadojo.p3b8a91c2 must remain stable.
Preserve parent web game source. All native UI uses SpatialUI + PicoTheme, no Material/Material3. Entry Main.kt stays thin. Implement game rules in pure domain/usecase, durable records in data/repository, state in ViewModel, panels in ui/game/components.
The managed 3D workflow failed before Codegen Handoff; see README for run IDs. User subsequently requested native simulator gameplay; SDK prototype implementation proceeded. The managed workflow remains failed and full design/architecture gates remain outstanding. Do not fake acceptance receipts.
Build with the existing Gradle wrapper and JDK21. Device operations use pico-cli with explicit device. Real hand tracking must be tested on a headset; previews are not runtime proof.
