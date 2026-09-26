// "Pañcāṅga" design system — design/tokens.json
package org.hora.panchanga.ui

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import org.hora.panchanga.R

object C {
    val ink = Color(0xFF0A0D1C); val ink2 = Color(0xFF10152B); val ink3 = Color(0xFF161D3A); val stage = Color(0xFF04060D)
    val lapis = Color(0xFF16204A); val lapis2 = Color(0xFF24336B); val cellA = Color(0xFF1A234C); val cellB = Color(0xFF101634)
    val gold = Color(0xFFE3AE4A); val goldSoft = Color(0xFFF3D491); val star = Color(0xFFEFE8D8); val muted = Color(0xFF8A91B0); val moon = Color(0xFFCBD5DE)
    val kumkum = Color(0xFFD9483E); val plum = Color(0xFF8F6BB8); val copper = Color(0xFFC07A43); val teal = Color(0xFF63B8B2); val brass = Color(0xFFC8924A)
    val line = Color(0x42E3AE4A); val line2 = Color(0x388A91B0); val panel = Color(0xDB080B18)
    val dayArc = Color(0xFF6B4D14); val nightArc = Color(0xFF0F1A4D); val sukla = Color(0xFF4E5E92); val krsna = Color(0xFF141A3A)
    val nature = mapOf(
        "dhruva" to Color(0xFF3E7F7A), "cara" to Color(0xFF3C5FA8), "ksipra" to Color(0xFFC9962F), "mrdu" to Color(0xFFA0698F),
        "ugra" to Color(0xFFA63A32), "tiksna" to Color(0xFF6B3A7E), "misra" to Color(0xFF6E7488),
    )
    val graha = mapOf(
        "Śani" to Color(0xFF6F7FB0), "Guru" to Color(0xFFE0B040), "Maṅgala" to Color(0xFFD0473A), "Sūrya" to Color(0xFFFFD27A),
        "Śukra" to Color(0xFFF4EFE6), "Budha" to Color(0xFF57A872), "Candra" to Color(0xFFCBD5DE),
    )
}

object F {
    val skt = FontFamily(Font(R.font.tiro_sanskrit, FontWeight.Normal), Font(R.font.tiro_sanskrit_italic, FontWeight.Normal, FontStyle.Italic))
    val tamil = FontFamily(Font(R.font.tiro_tamil))
    val sans = FontFamily(Font(R.font.noto_sans, FontWeight.Normal), Font(R.font.noto_sans, FontWeight.Medium), Font(R.font.noto_sans, FontWeight.SemiBold))
    val mono = FontFamily(Font(R.font.plex_mono, FontWeight.Normal), Font(R.font.plex_mono_medium, FontWeight.Medium), Font(R.font.plex_mono_semibold, FontWeight.SemiBold))
}

object T {
    fun skt(size: TextUnit, color: Color = C.star, italic: Boolean = false) =
        TextStyle(fontFamily = F.skt, fontSize = size, color = color, fontStyle = if (italic) FontStyle.Italic else FontStyle.Normal, lineHeight = size * 1.2)
    fun tamil(size: TextUnit, color: Color = C.muted) = TextStyle(fontFamily = F.tamil, fontSize = size, color = color)
    fun mono(size: TextUnit, color: Color = C.star, weight: FontWeight = FontWeight.Medium) =
        TextStyle(fontFamily = F.mono, fontSize = size, color = color, fontWeight = weight, fontFeatureSettings = "tnum")
    fun body(size: TextUnit = 14.sp, color: Color = C.star) = TextStyle(fontFamily = F.sans, fontSize = size, color = color, lineHeight = size * 1.5)
    /** Caps labels: 11–13px, letter-spacing .12em, muted */
    fun caps(size: TextUnit = 11.sp, color: Color = C.muted) =
        TextStyle(fontFamily = F.sans, fontSize = size, color = color, fontWeight = FontWeight.SemiBold, letterSpacing = 0.12.em)
}
