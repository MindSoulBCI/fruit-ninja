package com.example.fruitninjadojo.p3b8a91c2.platform

import android.app.Application
import com.pico.spatial.ui.foundation.dsl.launch
import com.example.fruitninjadojo.p3b8a91c2.mainApp

class SpatialApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        launch(::mainApp)
    }
}
