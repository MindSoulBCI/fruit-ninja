package com.example.fruitninjadojo.p3b8a91c2.account

import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.example.fruitninjadojo.p3b8a91c2.R

object AccountStore {
    var session by mutableStateOf<AccountSession?>(null)
        private set

    fun service(context: Context): AccountService {
        val base = context.getString(R.string.mindsoul_account_api).trim()
        val appId = context.getString(R.string.mindsoul_app_id).trim()
        return if (base.isEmpty() || appId.isEmpty()) UnconfiguredAccountService()
        else try {
            HttpAccountService(base, appId)
        } catch (_: Exception) {
            UnconfiguredAccountService()
        }
    }

    fun signIn(value: AccountSession) {
        session = value
    }

    fun signOut() {
        session = null
    }
}
