package com.example.fruitninjadojo.p3b8a91c2.account

import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.URL
import javax.net.ssl.HttpsURLConnection

/** 对接 space-forum-server 的 auth 接口，响应格式为 { code, msg, data }。 */
class HttpAccountService(
    private val baseUrl: String,
    private val appId: String,
) : AccountService {
    private val base = baseUrl.trimEnd('/')

    init {
        val url = URL(base)
        require(url.protocol == "https" && url.userInfo == null) { "Account API must use HTTPS without embedded credentials" }
        require(appId.isNotBlank()) { "appId required" }
    }

    override val configured = true

    private suspend fun post(path: String, body: JSONObject, token: String? = null): JSONObject = withContext(Dispatchers.IO) {
        val connection = URL(base + path).openConnection() as HttpsURLConnection
        try {
            connection.requestMethod = "POST"
            connection.connectTimeout = 12000
            connection.readTimeout = 20000
            connection.instanceFollowRedirects = false
            connection.doOutput = true
            connection.setRequestProperty("Content-Type", "application/json; charset=utf-8")
            connection.setRequestProperty("Accept", "application/json")
            if (token != null) connection.setRequestProperty("Authorization", "Bearer $token")
            connection.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
            val status = connection.responseCode
            val stream = if (status in 200..299) connection.inputStream else connection.errorStream
            val raw = stream?.use { it.readBytes() } ?: ByteArray(0)
            if (raw.size > 65536) throw AccountFailure("账号服务响应异常。")
            val json = if (raw.isEmpty()) JSONObject() else JSONObject(String(raw, Charsets.UTF_8))
            val code = json.optInt("code", if (status in 200..299) 200 else status)
            if (code != 200) {
                val msg = json.optString("msg").ifBlank { null }
                throw AccountFailure(msg ?: when (status) {
                    401, 403 -> "登录凭据无效或会话已过期，请重新登录。"
                    409 -> "该邮箱无法注册，请尝试登录。"
                    429 -> "操作过于频繁，请稍后再试。"
                    400, 422 -> "信息或验证码无效，请检查后重试。"
                    else -> "账号服务暂时不可用，请稍后重试。"
                })
            }
            json.optJSONObject("data") ?: JSONObject()
        } catch (e: CancellationException) {
            throw e
        } catch (e: AccountFailure) {
            throw e
        } catch (_: Exception) {
            throw AccountFailure("无法连接账号服务，请检查网络后重试。")
        } finally {
            connection.disconnect()
        }
    }

    private fun body(vararg fields: Pair<String, Any?>) = JSONObject().apply {
        put("appId", appId)
        fields.forEach { (key, value) -> if (value != null) put(key, value) }
    }

    private fun session(data: JSONObject): AccountSession {
        val token = data.optString("token").ifBlank { data.optString("accessToken") }
        if (token.isBlank() || token.any { it == '\r' || it == '\n' }) throw AccountFailure("账号服务返回了无效会话。")
        val userId = data.opt("userId")?.toString().orEmpty()
        val email = data.optString("email")
        val nickname = data.optString("nickname").ifBlank { email.substringBefore('@').ifBlank { "用户" } }
        val avatar = data.optString("avatar").ifBlank { "pilot" }
        return AccountSession(token, AccountProfile(userId, email, nickname, avatar))
    }

    override suspend fun sendCode(email: String, purpose: CodePurpose): Int {
        post("/auth/sendVerifyCode", body("email" to email))
        return 60
    }

    override suspend fun register(email: String, password: String, code: String) = session(
        post("/auth/signup", body(
            "email" to email,
            "password" to password,
            "rePassword" to password,
            "verifyCode" to code,
        ))
    )

    override suspend fun passwordLogin(email: String, password: String) = session(
        post("/auth/login", body("email" to email, "password" to password))
    )

    override suspend fun codeLogin(email: String, code: String) = session(
        post("/auth/loginByCode", body("email" to email, "verifyCode" to code))
    )

    override suspend fun resetPassword(email: String, code: String, newPassword: String) {
        post("/auth/forget", body(
            "email" to email,
            "verifyCode" to code,
            "newPassword" to newPassword,
            "reNewPassword" to newPassword,
        ))
    }

    override suspend fun logout(token: String) {
        // 服务端没有强制注销接口，清掉本机会话即可。
    }
}
