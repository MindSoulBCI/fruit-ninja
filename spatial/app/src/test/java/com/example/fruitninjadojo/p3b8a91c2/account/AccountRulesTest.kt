package com.example.fruitninjadojo.p3b8a91c2.account

import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test

class AccountRulesTest {
    @Test fun emailValidationRejectsMalformedAndWhitespace() {
        assertTrue(AccountRules.validEmail(AccountRules.email(" ninja+test@example.com ")))
        listOf("", "ninja", "ninja@", "@example.com", "a b@example.com", "a@example.com\nBcc:x@y.com").forEach {
            assertFalse(AccountRules.validEmail(it))
        }
    }

    @Test fun registrationPasswordAndVerificationCodeBoundaries() {
        assertFalse(AccountRules.validPassword("12345"))
        assertTrue(AccountRules.validPassword("abc123"))
        assertFalse(AccountRules.validPassword("bad pass"))
        assertFalse(AccountRules.validPassword("x".repeat(21)))
        assertTrue(AccountRules.validCode("012345"))
        assertFalse(AccountRules.validCode("12345"))
        assertFalse(AccountRules.validCode("12 345"))
        assertFalse(AccountRules.validCode("abcdef"))
    }

    @Test fun unconfiguredBackendNeverReturnsFakeSuccess() = runBlocking {
        val api = UnconfiguredAccountService()
        assertFalse(api.configured)
        val operations: List<suspend () -> Any?> = listOf(
            { api.sendCode("a@example.com", CodePurpose.LOGIN) },
            { api.register("a@example.com", "password123", "123456") },
            { api.passwordLogin("a@example.com", "password123") },
            { api.codeLogin("a@example.com", "123456") },
            { api.resetPassword("a@example.com", "123456", "newpassword") },
        )
        operations.forEach { operation ->
            try {
                operation()
                fail("Unconfigured backend must fail closed")
            } catch (e: AccountFailure) {
                assertTrue(e.message!!.contains("尚未配置"))
            }
        }
    }

    @Test fun httpAdapterRejectsInsecureEndpoint() {
        listOf("http://example.com", "https://user:password@example.com").forEach { url ->
            try {
                HttpAccountService(url, "fruit-ninja")
                fail("Insecure endpoint accepted")
            } catch (_: IllegalArgumentException) {
            }
        }
    }
}
