package com.example.fruitninjadojo.p3b8a91c2.ui.game.audio

import android.content.Context
import android.media.AudioAttributes
import android.media.SoundPool
import android.util.Log
import com.example.fruitninjadojo.p3b8a91c2.domain.usecase.GameSound
import java.util.concurrent.ConcurrentHashMap

/** SoundPool keeps short overlapping slice effects off the render thread. */
class GameAudio(context:Context):AutoCloseable {
 private val pool=SoundPool.Builder().setMaxStreams(12).setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_GAME).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build()).build()
 private val ids=mutableMapOf<String,Int>()
 private val loaded=ConcurrentHashMap.newKeySet<Int>()
 var enabled=true
 var volume=.65f
 init {
  pool.setOnLoadCompleteListener { _, id, status -> if(status==0)loaded.add(id) else Log.e("FruitDojo","AUDIO_LOAD_FAILED id=$id status=$status") }
  (listOf("start","combo","bomb","miss","whoosh")+listOf(0,1,2,4,5,6).map{"slice$it"}).forEach{name->context.assets.openFd("audio/$name.wav").use{ids[name]=pool.load(it,1)}}
 }
 fun play(event:GameSound){
  if(!enabled)return
  val id=ids[event.name]?:return
  if(id !in loaded)return
  val pan=(event.x*1.5f).coerceIn(-.75f,.75f)
  val stream=pool.play(id,volume*(1f-maxOf(0f,pan)),volume*(1f+minOf(0f,pan)),1,0,1f)
  Log.i("FruitDojo","AUDIO_PLAY name=${event.name} stream=$stream")
 }
 override fun close(){pool.release()}
}
