package com.example.fruitninjadojo.p3b8a91c2.content
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import com.pico.spatial.core.ecs.*
import com.pico.spatial.core.ecs.resource.*
import com.pico.spatial.core.math.*
import com.pico.spatial.ui.design.*
import com.pico.spatial.ui.foundation.content.SpatialView
import com.pico.spatial.ui.foundation.gesture.*
import com.pico.spatial.tracking.hand.*
import com.pico.spatial.tracking.hmd.*
import com.example.fruitninjadojo.p3b8a91c2.domain.usecase.*
import kotlinx.coroutines.isActive
import com.example.fruitninjadojo.p3b8a91c2.ui.game.scene.FruitResources
import com.example.fruitninjadojo.p3b8a91c2.ui.game.audio.GameAudio
import androidx.compose.ui.platform.LocalDensity
import com.pico.spatial.ui.platform.LocalPhysicalLengthConverter
import com.pico.spatial.ui.platform.LengthUnit

@Composable fun HomeStage(){
 val navigator=com.pico.spatial.ui.platform.containers.LocalSpatialNavigator.current
 val context=LocalContext.current
 val engine=remember{GameEngine()}; val root=remember{Entity()};val entities=remember{mutableMapOf<Int,Entity>()}
 val hmd=remember{HMDTrackingProvider()}; val provider=remember{HandTrackingProvider()}; var ready by remember{mutableStateOf(false)};var revision by remember{mutableIntStateOf(0)}
 var tracking by remember{mutableStateOf("可点中水果切开；摄像头手势等待中")}
 LaunchedEffect(ready){if(ready){kotlinx.coroutines.delay(3000);navigator.openWindowContainer("DojoGallery","gallery");navigator.openWindowContainer("DojoAccount","account")}}
 val previous=remember{arrayOfNulls<Point>(2)}
 val resources=remember{FruitResources(context)};val audio=remember{GameAudio(context)}
 val particles=remember{mutableMapOf<Int,Entity>()}
 val density=LocalDensity.current;val converter=LocalPhysicalLengthConverter.current
 var dragPoint by remember{mutableStateOf<Point?>(null)};var dragId by remember{mutableStateOf<Int?>(null)}
 var soundOn by remember{mutableStateOf(true)}
 fun delta(px:Float)=with(density){converter.dpToLength(px.toDp(),LengthUnit.Meters)}
 DisposableEffect(Unit){hmd.start();provider.start();onDispose{hmd.stop();provider.stop();root.destroy();resources.close();audio.close()}}
 LaunchedEffect(ready){if(!ready)return@LaunchedEffect;var last=0L;var calibrated=false;var hadHand=false;var warmup=0f;var lastWave=0;var hadFruit=false
 while(isActive){withFrameNanos{now->val dt=if(last==0L)0f else (now-last)/1e9f;last=now
 warmup+=dt.coerceAtMost(.1f)
 if(!calibrated&&warmup>2f){hmd.latestData?.hmdPose?.let{pose->
 val p=root.convertPositionFrom(pose.position,null);val q=root.convertRotationFrom(pose.rotation,null)
 root.components[TransformComponent::class.java]?.apply{setPosition(Vector3(p.x,p.y-1.2f,p.z));setQuaternion(q)}
 calibrated=true;android.util.Log.i("FruitDojo","View calibrated: $p")}}
 // A delayed simulator frame must not turn into a permanent pause. Drop the
 // stale hand segment and bound catch-up so fruit cannot teleport across a hand.
 if(dt>.25f)previous.fill(null)
 engine.tick(dt.coerceAtMost(.05f))
 if(engine.wave!=lastWave){lastWave=engine.wave;android.util.Log.i("FruitDojo","WAVE_START wave=$lastWave count=${engine.fruits.count{!it.piece}}")}
 if(hadFruit&&engine.fruits.isEmpty())android.util.Log.i("FruitDojo","WAVE_CLEARED wave=$lastWave")
 hadFruit=engine.fruits.isNotEmpty()
 val hands=provider.latestData
 val hasHand=hands?.left!=null||hands?.right!=null
 if(hadHand&&!hasHand){engine.playing=false;previous.fill(null)};hadHand=hasHand
 listOf(hands?.left,hands?.right).forEachIndexed{i,hand->
 val joint=hand?.get(HandJoint.Index.INDEX_TIP)
 val point=joint?.let{root.convertPositionFrom(it.position,null)}?.let{Point(it.x,it.y,it.z)}
 if(point!=null){previous[i]?.let{engine.trail(it,point);engine.sweep(it,point)}};previous[i]=point }
 tracking=if(hands?.left!=null||hands?.right!=null)"手部追踪已连接 · 挥手切水果" else "点中水果可切开 · 手部追踪等待中"
 val ids=engine.fruits.map{it.id}.toSet();entities.keys.filter{it !in ids&&it!=dragId}.toList().forEach{entities.remove(it)?.destroy()}
 engine.fruits.forEach{f->val e=entities.getOrPut(f.id){resources.fruit(f).also{root.addChild(it)}}
 e.components[TransformComponent::class.java]?.apply{
  setPosition(Vector3(f.p.x,f.p.y,f.p.z))
  setEulerAngles(EulerAngles(if(f.piece)15f else 0f,if(f.piece&&f.vx<0)-28f else if(f.piece)28f else 0f,f.life*f.spin))
 }}
 dragId?.let{if(it !in ids)entities[it]?.components?.get(TransformComponent::class.java)?.setScaleVector(Vector3(.001f,.001f,.001f))}
 val effectIds=engine.effects.map{it.id}.toSet();particles.keys.filter{it !in effectIds}.toList().forEach{particles.remove(it)?.destroy()}
 engine.effects.forEach{p->val e=particles.getOrPut(p.id){resources.particle(p.kind).also{root.addChild(it)}}
 val size=p.size/.085f*(p.life/p.duration).coerceIn(.05f,1f)
 e.components[TransformComponent::class.java]?.setPosition(Vector3(p.p.x,p.p.y,p.p.z))?.setScaleVector(Vector3(size,size,size))}
 audio.enabled=soundOn;engine.sounds.toList().forEach{audio.play(it)};engine.sounds.clear()
 revision++
 }} }
 SpatialView(modifier=Modifier.fillMaxSize().pointerInput(Unit){
 detectSpatialTapGesture(context,TargetEntity.any()){tap->entities.entries.firstOrNull{it.value==tap.targetEntity}?.let{entry->
 val f=engine.fruits.firstOrNull{it.id==entry.key};val before=engine.score
 if(f!=null)engine.trail(Point(f.p.x-.12f,f.p.y-.08f,f.p.z+.02f),Point(f.p.x+.12f,f.p.y+.08f,f.p.z+.02f))
 engine.slice(entry.key);android.util.Log.i("FruitDojo","POINTER_SLICE id=${entry.key} score=$before->${engine.score}")}}
 }.pointerInput(Unit){
 detectSpatialDragGesture(context,TargetEntity.any(),{_,value->
 val entry=entities.entries.firstOrNull{it.value==value.targetEntity};dragId=entry?.key
 dragPoint=engine.fruits.firstOrNull{it.id==dragId}?.p
 audio.play(GameSound("whoosh"))
 },{dragPoint=null;dragId=null},{dragPoint=null;dragId=null}){value->
 dragPoint?.let{a->val b=Point(a.x+delta(value.dragAmount.x),a.y-delta(value.dragAmount.y),a.z+delta(value.dragAmount.z))
 val before=engine.score;engine.trail(a,b);engine.sweep(a,b);dragPoint=b
 if(engine.score!=before)android.util.Log.i("FruitDojo","DRAG_SLICE score=$before->${engine.score}")}
 }
 },attachments={
 AttachmentPanel("score"){PicoTheme{Column(Modifier.width(320.dp).padding(24.dp),verticalArrangement=Arrangement.spacedBy(16.dp)){
 Text("水果忍者 · 空间道场",style=PicoTheme.typography.titleLarge)
 Text("得分  ${engine.score}",style=PicoTheme.typography.displaySmall)
 Text(if(engine.mode==0)"剩余机会 ${maxOf(0,3-engine.misses)}" else "剩余 ${engine.time.toInt()} 秒")
 Text("连击 ${engine.combo} · 已切 ${engine.sliced}");if(engine.noticeLife>0)Text(engine.notice);Text(tracking)
 Text(if(engine.playing)"挥手穿过水果，避开黑色炸弹" else "选择模式后开始 / 继续")
 revision
 }}}
 AttachmentPanel("settings"){revision;PicoTheme{Column(Modifier.width(320.dp).padding(24.dp),verticalArrangement=Arrangement.spacedBy(12.dp)){
 Text("道场设置",style=PicoTheme.typography.titleLarge)
 Button(onClick={navigator.openWindowContainer("DojoGallery","gallery")}){Text("打开道场窗口")}
 Button(onClick={navigator.openWindowContainer("DojoGuide","guide")}){Text("打开修行手册")}
 listOf("经典","街机","禅").forEachIndexed{i,name->Button(onClick={engine.mode=i;engine.start();previous.fill(null)}){Text(name+" · 开始")}}
 Button(onClick={engine.togglePause();previous.fill(null)}){Text(if(engine.ended)"本局已结束" else if(engine.playing)"暂停" else "继续")}
 Button(onClick={engine.start();previous.fill(null)}){Text("重新开始")}
 Button(onClick={soundOn=!soundOn}){Text(if(soundOn)"音效：开启" else "音效：关闭")}
 Text("鼠标：按住水果划切 / 点击\n双手：挥动穿过水果")
 }}}
 }){content,attachments->content.addEntity(root); android.util.Log.i("FruitDojo", "Scene attached")
 attachments.entity("score")?.let{it.components[TransformComponent::class.java]?.setPosition(Vector3(-.65f,1.35f,-1.1f))?.setScaleVector(Vector3(2f,2f,2f));root.addChild(it)}
 attachments.entity("settings")?.let{it.components[TransformComponent::class.java]?.setPosition(Vector3(.65f,1.35f,-1.1f))?.setScaleVector(Vector3(2f,2f,2f));root.addChild(it)}
 engine.start();ready=true
 }
}
