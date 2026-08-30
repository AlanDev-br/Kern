package com.alan.kern

import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.result.ActivityResultLauncher
import androidx.health.connect.client.PermissionController
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.Instant

/**
 * Ponte do Kern com o Health Connect.
 *
 * Superfície pequena de propósito: disponibilidade, catálogo, permissões e leitura por
 * tipo. Qualquer consolidação (média, rollup diário, cruzamento com a balança) é feita
 * no lado do app, sobre o dado bruto guardado — assim uma fórmula que melhorar
 * recalcula o histórico inteiro, em vez de exigir uma releitura do aparelho. É o mesmo
 * princípio já adotado na balança: guardar peso e impedância, derivar composição.
 */
@CapacitorPlugin(name = "KernHealth")
class KernHealthPlugin : Plugin() {

    private val impl = KernHealth()
    private var chamadaPermissao: PluginCall? = null
    private var lancador: ActivityResultLauncher<Set<String>>? = null

    override fun load() {
        super.load()
        val act = activity as? ComponentActivity
        if (act == null) {
            Log.e(TAG, "Activity nao e ComponentActivity: sem fluxo de permissao")
            return
        }
        // Precisa ser registrado antes de a activity chegar em STARTED — por isso vive
        // no load() do plugin, e não no momento em que a permissão é pedida.
        lancador = act.registerForActivityResult(
            PermissionController.createRequestPermissionResultContract(),
        ) { _ ->
            val chamada = chamadaPermissao
            chamadaPermissao = null
            if (chamada != null) responderSituacao(chamada)
        }
    }

    @PluginMethod
    fun disponibilidade(call: PluginCall) {
        try {
            call.resolve(impl.disponibilidade(context))
        } catch (e: Exception) {
            call.reject(e.message ?: e.toString())
        }
    }

    /** O catálogo que o Kern lê, com a permissão correspondente de cada tipo. */
    @PluginMethod
    fun catalogo(call: PluginCall) {
        val ret = JSObject()
        ret.put("tipos", impl.catalogo())
        call.resolve(ret)
    }

    @PluginMethod
    fun permissoes(call: PluginCall) {
        responderSituacao(call)
    }

    @PluginMethod
    fun pedirPermissoes(call: PluginCall) {
        val l = lancador
        if (l == null) {
            call.reject("fluxo de permissao indisponivel nesta activity")
            return
        }
        chamadaPermissao = call
        // Pede tudo de uma vez. O Health Connect mostra uma tela só, com as caixas por
        // tipo — pedir em levas seria uma sequência de diálogos para o mesmo fim.
        l.launch(impl.permissoesDesejadas())
    }

    /**
     * Lê um tipo numa janela. `inicio` e `fim` em ISO 8601; `limite` protege a memória
     * quando a série intradiária de FC devolve dezenas de milhares de amostras.
     */
    @PluginMethod
    fun ler(call: PluginCall) {
        val tipo = call.getString("tipo")
        val inicio = call.getString("inicio")
        val fim = call.getString("fim")
        if (tipo == null || inicio == null || fim == null) {
            call.reject("faltam parametros: tipo, inicio e fim")
            return
        }
        val limite = call.getInt("limite") ?: 5000

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val r = impl.ler(
                    context,
                    tipo,
                    Instant.parse(inicio),
                    Instant.parse(fim),
                    limite,
                )
                withContext(Dispatchers.Main) { call.resolve(r) }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) { call.reject(e.message ?: e.toString()) }
            }
        }
    }

    private fun responderSituacao(call: PluginCall) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val r = impl.situacaoPermissoes(context)
                withContext(Dispatchers.Main) { call.resolve(r) }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) { call.reject(e.message ?: e.toString()) }
            }
        }
    }

    private companion object {
        const val TAG = "KernHealth"
    }
}
