package com.example.fruitninjadojo.p3b8a91c2.ui.game.scene

import android.content.Context
import android.graphics.BitmapFactory
import com.pico.spatial.core.ecs.*
import com.pico.spatial.core.ecs.resource.*
import com.pico.spatial.core.math.*
import com.example.fruitninjadojo.p3b8a91c2.domain.usecase.Fruit

/** Scene-lifetime shared meshes/materials; each fruit only allocates its entities. */
class FruitResources(private val context:Context):AutoCloseable {
 private val meshes=mutableMapOf<String,MeshResource>()
 private val textures=mutableListOf<TextureResource>()
 private val materials=mutableListOf<UnlitMaterial>()
 private fun mesh(name:String)=meshes.getOrPut(name){MeshResource.load("fruit/$name.obj").also{it.toGlobal()}}
 private fun solid(r:Float,g:Float,b:Float)=UnlitMaterial.create().apply{setBaseColor(Color4(r,g,b,1f));toGlobal();materials.add(this)}
 private fun texture(name:String):UnlitMaterial {
  val bitmap=context.assets.open("fruit/$name.png").use{BitmapFactory.decodeStream(it)}
  val t=TextureResource.create(bitmap).also{it.toGlobal();textures.add(it)};bitmap.recycle()
  return solid(1f,1f,1f).apply{setBaseColorTexture(t)}
 }
 private val skins=(0..6).map{texture("skin$it")}
 private val flesh=(0..6).associateWith{if(it==3)skins[it] else texture("flesh$it")}
 private val leaf=solid(.40f,.65f,.20f);private val stem=solid(.40f,.27f,.13f)
 private val juices=listOf(0xff7065,0xffaf30,0xff5165,0xffcf6b,0xb6e246,0xff5870,0xd781b5,0xa5ffe0).map{solid((it shr 16 and 255)/255f,(it shr 8 and 255)/255f,(it and 255)/255f)}
 init {(0..6).forEach{mesh("whole$it");mesh("half$it");mesh("cap$it")};mesh("leaf");mesh("stem");mesh("whole")}
 fun fruit(f:Fruit):Entity=ModelEntity(mesh(if(f.piece)"half${f.kind}" else "whole${f.kind}"),skins[f.kind]).apply{
  if(f.piece)addChild(ModelEntity(mesh("cap${f.kind}"),flesh.getValue(f.kind)))
  else {
   components.set(InteractableComponent())
   components.set(CollisionComponent(collisionShape=listOf(ShapeResource.createSphere(.1f)),physicsMaterial=PhysicsMaterialResource()))
   if(f.kind !in listOf(2,4)){
    val top=if(f.kind==5).071f else .065f
    addChild(ModelEntity(mesh("stem"),stem).apply{components[TransformComponent::class.java]?.setPosition(Vector3(0f,top,0f))})
    if(f.kind!=3)repeat(if(f.kind==5)5 else 1){n->addChild(ModelEntity(mesh("leaf"),leaf).apply{components[TransformComponent::class.java]?.setPosition(Vector3(0f,top+.012f,0f))?.setEulerAngles(EulerAngles(0f,n*72f,if(f.kind==5)-12f else 20f))})}
   }
  }
 }
 fun particle(kind:Int)=ModelEntity(mesh("whole"),juices[kind])
 override fun close(){meshes.values.forEach{it.close()};materials.forEach{it.close()};textures.forEach{it.close()}}
}
