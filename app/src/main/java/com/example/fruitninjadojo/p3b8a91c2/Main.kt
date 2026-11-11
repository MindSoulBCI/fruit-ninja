package com.example.fruitninjadojo.p3b8a91c2

import com.example.fruitninjadojo.p3b8a91c2.content.HomeStage
import com.example.fruitninjadojo.p3b8a91c2.content.DojoWindow
import com.example.fruitninjadojo.p3b8a91c2.content.AccountWindow
import com.pico.spatial.ui.foundation.dsl.*
import androidx.compose.ui.unit.dp
import com.pico.spatial.ui.design.PicoTheme
import com.pico.spatial.ui.foundation.dsl.DefaultStage
import com.pico.spatial.ui.foundation.dsl.SpatialAppScope

fun mainApp(scope: SpatialAppScope) =
    with(scope) {
        WindowContainer(id="DojoGallery", form=Form.Planar, defaultSize=WindowContainerSize(width=720.dp,height=580.dp)){DojoWindow()}
        WindowContainer(id="DojoGuide", form=Form.Planar, defaultSize=WindowContainerSize(width=600.dp,height=680.dp)){DojoWindow(true)}
        WindowContainer(id="DojoAccount", form=Form.Planar, defaultSize=WindowContainerSize(width=560.dp,height=720.dp)){AccountWindow()}
        DefaultStage {
            PicoTheme {
                HomeStage()
            }
        }
    }

