package com.example.fruitninjadojo.p3b8a91c2.content
import androidx.compose.runtime.Composable
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.unit.dp
import com.pico.spatial.ui.design.*

/** Decorative content inside a real OS WindowContainer; gameplay stays in Stage. */
@Composable fun DojoWindow(guide:Boolean=false){
 PicoTheme{Column(Modifier.fillMaxSize().padding(32.dp),verticalArrangement=Arrangement.spacedBy(20.dp)){
 Text(if(guide)"修行手册" else "水果忍者 · 空间道场",style=PicoTheme.typography.displaySmall)
 if(!guide){
 Canvas(Modifier.fillMaxWidth().height(220.dp)){
 drawRect(Color(0xFF35281D))
 val plank=size.width/7
 for(i in 0..7){val x=i*plank;drawLine(Color(0xFF20190F),Offset(x,0f),Offset(x,size.height),4f)
 for(j in 1..9){val gx=x+j*plank/10;drawLine(Color(0xFF58412B),Offset(gx,0f),Offset(gx+7f,size.height),1f)}}
 drawCircle(Color(0xFF9E8150),size.height*.34f,Offset(size.width*.77f,size.height*.5f),style=androidx.compose.ui.graphics.drawscope.Stroke(3f))
 val colors=listOf(0xFF529646,0xFFFF9820,0xFFE93D43,0xFF997748,0xFFF04663,0xFF945AAB)
 colors.forEachIndexed{i,c->drawCircle(Color(c),size.height*.12f,Offset(size.width*(.10f+i*.12f),size.height*.58f))}
 }
 Text("一刀一果，心手合一。",style=PicoTheme.typography.titleLarge)
 Text("西瓜  ·  橙子  ·  苹果  ·  猕猴桃  ·  草莓  ·  李子")
 }else{
 Text("经典模式",style=PicoTheme.typography.titleLarge);Text("漏掉三颗水果或切到炸弹，本局结束。")
 Text("街机模式",style=PicoTheme.typography.titleLarge);Text("60 秒挑战；炸弹扣 10 分，连切 20 个触发狂热。")
 Text("禅模式",style=PicoTheme.typography.titleLarge);Text("90 秒自由练习，无炸弹、无漏果惩罚。")
 }
 Text("按住水果划切，或挥动双手穿过水果。三连切起获得额外奖励。")
 Text("每批水果与果肉落下后，稍停一下，再出下一批。")
 }}
}
