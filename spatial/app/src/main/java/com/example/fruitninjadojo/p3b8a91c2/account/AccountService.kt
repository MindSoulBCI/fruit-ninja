package com.example.fruitninjadojo.p3b8a91c2.account

/** 密码哈希和验证码校验都在服务端完成。 */
enum class CodePurpose(val wire: String) { REGISTER("register"), LOGIN("login"), RESET("reset_password") }
data class AccountProfile(val id: String, val email: String, val displayName: String, val avatar: String)
data class AccountSession(val accessToken: String, val profile: AccountProfile)
class AccountFailure(message: String) : Exception(message)

interface AccountService {
    val configured: Boolean
    suspend fun sendCode(email: String, purpose: CodePurpose): Int
    suspend fun register(email: String, password: String, code: String): AccountSession
    suspend fun passwordLogin(email: String, password: String): AccountSession
    suspend fun codeLogin(email: String, code: String): AccountSession
    suspend fun resetPassword(email: String, code: String, newPassword: String)
    suspend fun logout(token: String)
}

object AccountRules {
    fun email(value: String): String = value.trim()
    fun validEmail(value: String) = value.length <= 254 && Regex("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$").matches(value)
    /** 与 space-forum-server 一致：6–20 位字母或数字 */
    fun validPassword(value: String) = value.length in 6..20 && value.all { it.isLetterOrDigit() }
    fun validCode(value: String) = Regex("^[0-9]{6}$").matches(value)
}

class UnconfiguredAccountService : AccountService {
    override val configured = false
    private fun unavailable(): Nothing = throw AccountFailure("账号服务尚未配置。当前不能注册或登录，可以先以游客切水果。")
    override suspend fun sendCode(email: String, purpose: CodePurpose): Int = unavailable()
    override suspend fun register(email: String, password: String, code: String): AccountSession = unavailable()
    override suspend fun passwordLogin(email: String, password: String): AccountSession = unavailable()
    override suspend fun codeLogin(email: String, code: String): AccountSession = unavailable()
    override suspend fun resetPassword(email: String, code: String, newPassword: String): Unit = unavailable()
    override suspend fun logout(token: String): Unit = unavailable()
}
