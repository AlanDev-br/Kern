package com.alan.kern

import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.impl.converters.datatype.RECORDS_TYPE_NAME_MAP
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ActiveCaloriesBurnedRecord
import androidx.health.connect.client.records.BasalBodyTemperatureRecord
import androidx.health.connect.client.records.BasalMetabolicRateRecord
import androidx.health.connect.client.records.BloodGlucoseRecord
import androidx.health.connect.client.records.BloodPressureRecord
import androidx.health.connect.client.records.BodyFatRecord
import androidx.health.connect.client.records.BodyTemperatureRecord
import androidx.health.connect.client.records.BodyWaterMassRecord
import androidx.health.connect.client.records.BoneMassRecord
import androidx.health.connect.client.records.CyclingPedalingCadenceRecord
import androidx.health.connect.client.records.DistanceRecord
import androidx.health.connect.client.records.ElevationGainedRecord
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.FloorsClimbedRecord
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.HeartRateVariabilityRmssdRecord
import androidx.health.connect.client.records.HeightRecord
import androidx.health.connect.client.records.HydrationRecord
import androidx.health.connect.client.records.InstantaneousRecord
import androidx.health.connect.client.records.IntervalRecord
import androidx.health.connect.client.records.LeanBodyMassRecord
import androidx.health.connect.client.records.NutritionRecord
import androidx.health.connect.client.records.OxygenSaturationRecord
import androidx.health.connect.client.records.PowerRecord
import androidx.health.connect.client.records.Record
import androidx.health.connect.client.records.RespiratoryRateRecord
import androidx.health.connect.client.records.RestingHeartRateRecord
import androidx.health.connect.client.records.SkinTemperatureRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.SpeedRecord
import androidx.health.connect.client.records.StepsCadenceRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.records.TotalCaloriesBurnedRecord
import androidx.health.connect.client.records.Vo2MaxRecord
import androidx.health.connect.client.records.WeightRecord
import androidx.health.connect.client.records.WheelchairPushesRecord
import androidx.health.connect.client.records.metadata.Metadata
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import java.time.Instant
import kotlin.reflect.KClass

/**
 * Leitura do Health Connect para o Kern.
 *
 * Existe em vez de usar o plugin de prateleira por um motivo só: aquele plugin
 * converte cinco tipos de registro para JSON e devolve `record.toString()` para todo o
 * resto. Um SpO2 chegando como texto de data class não é dado, é sorte. Aqui todo tipo
 * do catálogo tem conversão explícita.
 *
 * ENVELOPE UNIFORME — decisão central deste arquivo. Toda leitura, de qualquer tipo,
 * sai com a mesma casca: identidade, janela de tempo, uma métrica escalar principal com
 * unidade, e um `extra` com o que for específico do tipo. É isso que permite guardar
 * tudo numa tabela só do lado do app e ter um explorador cru que não precisa de um ramo
 * por tipo. O que não couber no escalar não se perde: cai inteiro no `extra`.
 */
class KernHealth {

    companion object {
        /**
         * Catálogo lido pelo Kern. Os nomes são as chaves do RECORDS_TYPE_NAME_MAP da
         * androidx — é esse mapa que traduz nome em permissão, então inventar nome aqui
         * significa permissão descartada em silêncio (foi exatamente o bug do
         * "HeartRate" que existia no app).
         *
         * Ficam de fora, de propósito, os tipos de saúde reprodutiva: não têm uso no
         * Kern e só poluiriam a tela de consentimento do Health Connect.
         */
        val CATALOGO = listOf(
            // movimento
            "Steps",
            "StepsCadenceSeries",
            "Distance",
            "SpeedSeries",
            "PowerSeries",
            "CyclingPedalingCadenceSeries",
            "FloorsClimbed",
            "ElevationGained",
            "WheelchairPushes",
            "ActivitySession",
            // energia
            "TotalCaloriesBurned",
            "ActiveCaloriesBurned",
            "BasalMetabolicRate",
            // coração e respiração
            "HeartRateSeries",
            "RestingHeartRate",
            "HeartRateVariabilityRmssd",
            "OxygenSaturation",
            "RespiratoryRate",
            "Vo2Max",
            "BloodPressure",
            // sono
            "SleepSession",
            // corpo
            "Weight",
            "Height",
            "BodyFat",
            "BodyWaterMass",
            "BoneMass",
            "LeanBodyMass",
            "SkinTemperature",
            "BodyTemperature",
            "BasalBodyTemperature",
            // ingestão
            "Hydration",
            "Nutrition",
            "BloodGlucose",
        )

        /**
         * Permissões que não são de registro e por isso o plugin de prateleira nunca
         * conseguiu pedir — ele só sabe traduzir nome de tipo.
         *
         * Sem HISTORY o Health Connect entrega apenas os últimos 30 dias, o que para um
         * app de acompanhamento de 90 dias é o mesmo que não ter histórico.
         */
        val PERMISSOES_EXTRAS = listOf(
            HealthPermission.PERMISSION_READ_HEALTH_DATA_HISTORY,
            HealthPermission.PERMISSION_READ_HEALTH_DATA_IN_BACKGROUND,
        )

        /** Nome do tipo → permissão de leitura. Null quando o nome não existe no mapa. */
        fun permissaoDe(tipo: String): String? {
            val classe = RECORDS_TYPE_NAME_MAP[tipo] ?: return null
            return HealthPermission.getReadPermission(recordType = classe)
        }

        fun classeDe(tipo: String): KClass<out Record>? = RECORDS_TYPE_NAME_MAP[tipo]
    }

    // ── Disponibilidade e permissões ──────────────────────────────────────────

    fun disponibilidade(contexto: android.content.Context): JSObject {
        val ret = JSObject()
        val status = HealthConnectClient.getSdkStatus(contexto)
        ret.put(
            "status",
            when (status) {
                HealthConnectClient.SDK_AVAILABLE -> "ok"
                HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> "precisa-atualizar"
                else -> "sem-app"
            },
        )
        ret.put("sdkStatus", status)
        return ret
    }

    /** O catálogo com a permissão de cada tipo, para a tela de diagnóstico. */
    fun catalogo(): JSArray {
        val arr = JSArray()
        for (tipo in CATALOGO) {
            val o = JSObject()
            o.put("tipo", tipo)
            o.put("permissao", permissaoDe(tipo) ?: "")
            o.put("conhecido", permissaoDe(tipo) != null)
            arr.put(o)
        }
        return arr
    }

    /** Permissões do catálogo mais as extras, na ordem em que devem ser pedidas. */
    fun permissoesDesejadas(): Set<String> {
        val set = linkedSetOf<String>()
        for (tipo in CATALOGO) permissaoDe(tipo)?.let { set.add(it) }
        set.addAll(PERMISSOES_EXTRAS)
        return set
    }

    /**
     * Situação por tipo: concedido ou não. Devolve também as duas extras separadas,
     * porque elas mudam o alcance da leitura, não o conteúdo.
     */
    suspend fun situacaoPermissoes(contexto: android.content.Context): JSObject {
        val cliente = HealthConnectClient.getOrCreate(contexto)
        val concedidas = cliente.permissionController.getGrantedPermissions()

        val porTipo = JSObject()
        val faltando = JSArray()
        var quantos = 0
        for (tipo in CATALOGO) {
            val perm = permissaoDe(tipo)
            val ok = perm != null && concedidas.contains(perm)
            porTipo.put(tipo, ok)
            if (ok) quantos++ else faltando.put(tipo)
        }

        val ret = JSObject()
        ret.put("porTipo", porTipo)
        ret.put("faltando", faltando)
        ret.put("concedidos", quantos)
        ret.put("total", CATALOGO.size)
        ret.put(
            "historico",
            concedidas.contains(HealthPermission.PERMISSION_READ_HEALTH_DATA_HISTORY),
        )
        ret.put(
            "segundoPlano",
            concedidas.contains(HealthPermission.PERMISSION_READ_HEALTH_DATA_IN_BACKGROUND),
        )
        return ret
    }

    // ── Leitura ───────────────────────────────────────────────────────────────

    /**
     * Lê um tipo numa janela, paginando até o fim.
     *
     * Falta de permissão não é erro: devolve lista vazia com `permitido: false`. Uma
     * tela de diagnóstico que morre no primeiro tipo negado não diagnostica nada — o
     * que interessa é o mapa completo do que veio e do que não veio.
     */
    suspend fun ler(
        contexto: android.content.Context,
        tipo: String,
        inicio: Instant,
        fim: Instant,
        limite: Int,
    ): JSObject {
        val ret = JSObject()
        ret.put("tipo", tipo)

        val classe = classeDe(tipo)
        if (classe == null) {
            ret.put("permitido", false)
            ret.put("erro", "tipo desconhecido no Health Connect")
            ret.put("registros", JSArray())
            return ret
        }

        val cliente = HealthConnectClient.getOrCreate(contexto)
        val perm = permissaoDe(tipo)
        val concedidas = cliente.permissionController.getGrantedPermissions()
        if (perm == null || !concedidas.contains(perm)) {
            ret.put("permitido", false)
            ret.put("registros", JSArray())
            return ret
        }
        ret.put("permitido", true)

        val registros = JSArray()
        var total = 0
        var token: String? = null
        var truncado = false
        try {
            do {
                val resposta = cliente.readRecords(
                    ReadRecordsRequest(
                        recordType = classe,
                        timeRangeFilter = TimeRangeFilter.between(inicio, fim),
                        pageSize = 1000,
                        pageToken = token,
                    ),
                )
                for (r in resposta.records) {
                    if (total >= limite) {
                        truncado = true
                        break
                    }
                    registros.put(converter(tipo, r))
                    total++
                }
                token = resposta.pageToken
            } while (!truncado && token != null && token.isNotEmpty())
        } catch (e: Exception) {
            ret.put("erro", e.message ?: e.toString())
        }

        ret.put("registros", registros)
        ret.put("quantidade", total)
        ret.put("truncado", truncado)
        return ret
    }

    // ── Conversão ─────────────────────────────────────────────────────────────

    private fun metadadosJson(m: Metadata): JSObject {
        val o = JSObject()
        o.put("id", m.id)
        o.put("origem", m.dataOrigin.packageName)
        o.put("modificadoEm", m.lastModifiedTime.toString())
        o.put("idCliente", m.clientRecordId)
        o.put("metodo", metodoRegistro(m.recordingMethod))
        val d = m.device
        if (d != null) {
            val dj = JSObject()
            dj.put("fabricante", d.manufacturer)
            dj.put("modelo", d.model)
            dj.put("tipo", tipoDispositivo(d.type))
            o.put("dispositivo", dj)
        }
        return o
    }

    private fun metodoRegistro(m: Int): String = when (m) {
        1 -> "ativamente-registrado"
        2 -> "automatico"
        3 -> "manual"
        else -> "desconhecido"
    }

    private fun tipoDispositivo(t: Int): String = when (t) {
        1 -> "relogio"
        2 -> "celular"
        3 -> "balanca"
        4 -> "anel"
        5 -> "cabeca"
        6 -> "pulseira"
        7 -> "cinta-peitoral"
        8 -> "display"
        else -> "desconhecido"
    }

    /** Monta a casca comum e deixa o específico para [detalhar]. */
    private fun converter(tipo: String, r: Record): JSObject {
        val o = JSObject()
        o.put("tipo", tipo)
        o.put("meta", metadadosJson(r.metadata))

        when (r) {
            is IntervalRecord -> {
                o.put("inicio", r.startTime.toString())
                o.put("fim", r.endTime.toString())
                o.put("fusoInicio", r.startZoneOffset?.toString())
                o.put("duracaoMin", (r.endTime.epochSecond - r.startTime.epochSecond) / 60.0)
            }
            is InstantaneousRecord -> {
                o.put("inicio", r.time.toString())
                o.put("fim", r.time.toString())
                o.put("fusoInicio", r.zoneOffset?.toString())
            }
            else -> {
                // Sessões (sono, exercício) não implementam nenhuma das duas interfaces
                // na versão atual da androidx; o ramo específico preenche os tempos.
            }
        }

        detalhar(o, r)
        return o
    }

    private fun escalar(o: JSObject, valor: Double?, unidade: String) {
        if (valor != null && !valor.isNaN()) o.put("valor", valor)
        o.put("unidade", unidade)
    }

    private fun detalhar(o: JSObject, r: Record) {
        val extra = JSObject()
        when (r) {
            // ── movimento ──
            is StepsRecord -> escalar(o, r.count.toDouble(), "passos")

            is StepsCadenceRecord -> {
                val amostras = JSArray()
                var soma = 0.0
                for (a in r.samples) {
                    val s = JSObject()
                    s.put("t", a.time.toString())
                    s.put("v", a.rate)
                    amostras.put(s)
                    soma += a.rate
                }
                extra.put("amostras", amostras)
                escalar(o, if (r.samples.isEmpty()) null else soma / r.samples.size, "passos/min")
            }

            is DistanceRecord -> escalar(o, r.distance.inMeters, "m")
            is ElevationGainedRecord -> escalar(o, r.elevation.inMeters, "m")
            is FloorsClimbedRecord -> escalar(o, r.floors, "andares")
            is WheelchairPushesRecord -> escalar(o, r.count.toDouble(), "impulsos")

            is SpeedRecord -> {
                val amostras = JSArray()
                var soma = 0.0
                for (a in r.samples) {
                    val s = JSObject()
                    s.put("t", a.time.toString())
                    s.put("v", a.speed.inMetersPerSecond)
                    amostras.put(s)
                    soma += a.speed.inMetersPerSecond
                }
                extra.put("amostras", amostras)
                escalar(o, if (r.samples.isEmpty()) null else soma / r.samples.size, "m/s")
            }

            is PowerRecord -> {
                val amostras = JSArray()
                var soma = 0.0
                for (a in r.samples) {
                    val s = JSObject()
                    s.put("t", a.time.toString())
                    s.put("v", a.power.inWatts)
                    amostras.put(s)
                    soma += a.power.inWatts
                }
                extra.put("amostras", amostras)
                escalar(o, if (r.samples.isEmpty()) null else soma / r.samples.size, "W")
            }

            is CyclingPedalingCadenceRecord -> {
                val amostras = JSArray()
                var soma = 0.0
                for (a in r.samples) {
                    val s = JSObject()
                    s.put("t", a.time.toString())
                    s.put("v", a.revolutionsPerMinute)
                    amostras.put(s)
                    soma += a.revolutionsPerMinute
                }
                extra.put("amostras", amostras)
                escalar(o, if (r.samples.isEmpty()) null else soma / r.samples.size, "rpm")
            }

            is ExerciseSessionRecord -> {
                o.put("inicio", r.startTime.toString())
                o.put("fim", r.endTime.toString())
                val minutos = (r.endTime.epochSecond - r.startTime.epochSecond) / 60.0
                o.put("duracaoMin", minutos)
                escalar(o, minutos, "min")
                extra.put("modalidadeId", r.exerciseType)
                extra.put("modalidade", modalidade(r.exerciseType))
                extra.put("titulo", r.title)
                extra.put("notas", r.notes)
                extra.put("segmentos", r.segments.size)
                extra.put("voltas", r.laps.size)
            }

            // ── energia ──
            is TotalCaloriesBurnedRecord -> escalar(o, r.energy.inKilocalories, "kcal")
            is ActiveCaloriesBurnedRecord -> escalar(o, r.energy.inKilocalories, "kcal")
            is BasalMetabolicRateRecord ->
                escalar(o, r.basalMetabolicRate.inKilocaloriesPerDay, "kcal/dia")

            // ── coração e respiração ──
            is HeartRateRecord -> {
                val amostras = JSArray()
                var soma = 0.0
                var min = Long.MAX_VALUE
                var max = Long.MIN_VALUE
                for (a in r.samples) {
                    val s = JSObject()
                    s.put("t", a.time.toString())
                    s.put("v", a.beatsPerMinute)
                    amostras.put(s)
                    soma += a.beatsPerMinute
                    if (a.beatsPerMinute < min) min = a.beatsPerMinute
                    if (a.beatsPerMinute > max) max = a.beatsPerMinute
                }
                extra.put("amostras", amostras)
                if (r.samples.isNotEmpty()) {
                    extra.put("min", min)
                    extra.put("max", max)
                }
                escalar(o, if (r.samples.isEmpty()) null else soma / r.samples.size, "bpm")
            }

            is RestingHeartRateRecord -> escalar(o, r.beatsPerMinute.toDouble(), "bpm")
            is HeartRateVariabilityRmssdRecord ->
                escalar(o, r.heartRateVariabilityMillis, "ms")
            is OxygenSaturationRecord -> escalar(o, r.percentage.value, "%")
            is RespiratoryRateRecord -> escalar(o, r.rate, "resp/min")
            is Vo2MaxRecord -> {
                escalar(o, r.vo2MillilitersPerMinuteKilogram, "ml/kg/min")
                extra.put("metodoId", r.measurementMethod)
            }
            is BloodPressureRecord -> {
                escalar(o, r.systolic.inMillimetersOfMercury, "mmHg")
                extra.put("diastolica", r.diastolic.inMillimetersOfMercury)
            }

            // ── sono ──
            is SleepSessionRecord -> {
                o.put("inicio", r.startTime.toString())
                o.put("fim", r.endTime.toString())
                val minutos = (r.endTime.epochSecond - r.startTime.epochSecond) / 60.0
                o.put("duracaoMin", minutos)
                escalar(o, minutos, "min")
                extra.put("titulo", r.title)

                val estagios = JSArray()
                val porEstagio = HashMap<String, Double>()
                for (e in r.stages) {
                    val nome = estagioSono(e.stage)
                    val min = (e.endTime.epochSecond - e.startTime.epochSecond) / 60.0
                    val s = JSObject()
                    s.put("inicio", e.startTime.toString())
                    s.put("fim", e.endTime.toString())
                    s.put("estagio", nome)
                    s.put("min", min)
                    estagios.put(s)
                    porEstagio[nome] = (porEstagio[nome] ?: 0.0) + min
                }
                extra.put("estagios", estagios)
                val resumo = JSObject()
                for ((k, v) in porEstagio) resumo.put(k, v)
                extra.put("minPorEstagio", resumo)
            }

            // ── corpo ──
            is WeightRecord -> escalar(o, r.weight.inKilograms, "kg")
            is HeightRecord -> escalar(o, r.height.inMeters, "m")
            is BodyFatRecord -> escalar(o, r.percentage.value, "%")
            is BodyWaterMassRecord -> escalar(o, r.mass.inKilograms, "kg")
            is BoneMassRecord -> escalar(o, r.mass.inKilograms, "kg")
            is LeanBodyMassRecord -> escalar(o, r.mass.inKilograms, "kg")
            is BodyTemperatureRecord -> escalar(o, r.temperature.inCelsius, "°C")
            is BasalBodyTemperatureRecord -> escalar(o, r.temperature.inCelsius, "°C")

            is SkinTemperatureRecord -> {
                // A pulseira reporta variação em relação a uma linha de base, não
                // temperatura absoluta — o valor sozinho não significa nada sem ela.
                escalar(o, r.baseline?.inCelsius, "°C")
                val deltas = JSArray()
                for (d in r.deltas) {
                    val s = JSObject()
                    s.put("t", d.time.toString())
                    s.put("v", d.delta.inCelsius)
                    deltas.put(s)
                }
                extra.put("deltas", deltas)
                extra.put("temBaseline", r.baseline != null)
            }

            // ── ingestão ──
            is HydrationRecord -> escalar(o, r.volume.inLiters, "L")
            is NutritionRecord -> {
                escalar(o, r.energy?.inKilocalories, "kcal")
                extra.put("proteinaG", r.protein?.inGrams)
                extra.put("gorduraG", r.totalFat?.inGrams)
                extra.put("carboidratoG", r.totalCarbohydrate?.inGrams)
                extra.put("nome", r.name)
            }
            is BloodGlucoseRecord -> escalar(o, r.level.inMillimolesPerLiter, "mmol/L")

            else -> {
                // Nenhum tipo do catálogo cai aqui. Se cair, o texto cru é melhor do
                // que silêncio — e a tela de diagnóstico mostra que falta conversão.
                extra.put("cru", r.toString())
            }
        }
        o.put("extra", extra)
    }

    private fun estagioSono(s: Int): String = when (s) {
        1 -> "acordado"
        2 -> "sono"
        3 -> "fora-da-cama"
        4 -> "leve"
        5 -> "profundo"
        6 -> "rem"
        7 -> "na-cama-acordado"
        else -> "desconhecido"
    }

    private fun modalidade(t: Int): String = when (t) {
        8, 9 -> "bicicleta"
        13 -> "calistenia"
        25 -> "eliptico"
        33 -> "respiracao-guiada"
        36 -> "hiit"
        37 -> "trilha"
        48 -> "pilates"
        53, 54 -> "remo"
        56, 57 -> "corrida"
        68, 69 -> "escada"
        70, 81 -> "musculacao"
        71 -> "alongamento"
        73, 74 -> "natacao"
        79 -> "caminhada"
        83 -> "yoga"
        0 -> "outro"
        else -> "modalidade-$t"
    }
}
