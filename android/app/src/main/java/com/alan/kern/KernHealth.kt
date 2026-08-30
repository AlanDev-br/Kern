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

    /**
     * Monta a casca comum e deixa o resto para [detalhar].
     *
     * A janela de tempo também é preenchida lá, ramo a ramo, e não aqui num teste
     * genérico: as interfaces `IntervalRecord` e `InstantaneousRecord` da androidx são
     * `internal`, ou seja, não dá para perguntar a um `Record` qual das duas ele é.
     * Como cada ramo já sabe o tipo concreto, ele também sabe se o registro tem
     * início/fim ou um instante só.
     */
    private fun converter(tipo: String, r: Record): JSObject {
        val o = JSObject()
        o.put("tipo", tipo)
        o.put("meta", metadadosJson(r.metadata))
        detalhar(o, r)
        return o
    }

    /** Registro com duração: início, fim e os minutos entre eles. */
    private fun intervalo(o: JSObject, ini: Instant, fim: Instant) {
        o.put("inicio", ini.toString())
        o.put("fim", fim.toString())
        o.put("duracaoMin", (fim.epochSecond - ini.epochSecond) / 60.0)
    }

    /** Medida pontual: início e fim iguais, para o envelope não ter caso especial. */
    private fun instante(o: JSObject, t: Instant) {
        o.put("inicio", t.toString())
        o.put("fim", t.toString())
    }

    private fun escalar(o: JSObject, valor: Double?, unidade: String) {
        if (valor != null && !valor.isNaN()) o.put("valor", valor)
        o.put("unidade", unidade)
    }

    private fun detalhar(o: JSObject, r: Record) {
        val extra = JSObject()
        when (r) {
            // ── movimento ──
            is StepsRecord -> {
                intervalo(o, r.startTime, r.endTime)
                escalar(o, r.count.toDouble(), "passos")
            }

            is StepsCadenceRecord -> {
                intervalo(o, r.startTime, r.endTime)
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

            is DistanceRecord -> {
                intervalo(o, r.startTime, r.endTime)
                escalar(o, r.distance.inMeters, "m")
            }

            is ElevationGainedRecord -> {
                intervalo(o, r.startTime, r.endTime)
                escalar(o, r.elevation.inMeters, "m")
            }

            is FloorsClimbedRecord -> {
                intervalo(o, r.startTime, r.endTime)
                escalar(o, r.floors, "andares")
            }

            is WheelchairPushesRecord -> {
                intervalo(o, r.startTime, r.endTime)
                escalar(o, r.count.toDouble(), "impulsos")
            }

            is SpeedRecord -> {
                intervalo(o, r.startTime, r.endTime)
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
                intervalo(o, r.startTime, r.endTime)
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
                intervalo(o, r.startTime, r.endTime)
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
                intervalo(o, r.startTime, r.endTime)
                escalar(o, (r.endTime.epochSecond - r.startTime.epochSecond) / 60.0, "min")
                extra.put("modalidadeId", r.exerciseType)
                extra.put("modalidade", modalidade(r.exerciseType))
                extra.put("titulo", r.title)
                extra.put("notas", r.notes)
                extra.put("segmentos", r.segments.size)
                extra.put("voltas", r.laps.size)
            }

            // ── energia ──
            is TotalCaloriesBurnedRecord -> {
                intervalo(o, r.startTime, r.endTime)
                escalar(o, r.energy.inKilocalories, "kcal")
            }

            is ActiveCaloriesBurnedRecord -> {
                intervalo(o, r.startTime, r.endTime)
                escalar(o, r.energy.inKilocalories, "kcal")
            }

            is BasalMetabolicRateRecord -> {
                instante(o, r.time)
                escalar(o, r.basalMetabolicRate.inKilocaloriesPerDay, "kcal/dia")
            }

            // ── coração e respiração ──
            is HeartRateRecord -> {
                intervalo(o, r.startTime, r.endTime)
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

            is RestingHeartRateRecord -> {
                instante(o, r.time)
                escalar(o, r.beatsPerMinute.toDouble(), "bpm")
            }

            is HeartRateVariabilityRmssdRecord -> {
                instante(o, r.time)
                escalar(o, r.heartRateVariabilityMillis, "ms")
            }

            is OxygenSaturationRecord -> {
                instante(o, r.time)
                escalar(o, r.percentage.value, "%")
            }

            is RespiratoryRateRecord -> {
                instante(o, r.time)
                escalar(o, r.rate, "resp/min")
            }

            is Vo2MaxRecord -> {
                instante(o, r.time)
                escalar(o, r.vo2MillilitersPerMinuteKilogram, "ml/kg/min")
                extra.put("metodoId", r.measurementMethod)
            }

            is BloodPressureRecord -> {
                instante(o, r.time)
                escalar(o, r.systolic.inMillimetersOfMercury, "mmHg")
                extra.put("diastolica", r.diastolic.inMillimetersOfMercury)
            }

            // ── sono ──
            is SleepSessionRecord -> {
                intervalo(o, r.startTime, r.endTime)
                escalar(o, (r.endTime.epochSecond - r.startTime.epochSecond) / 60.0, "min")
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
            is WeightRecord -> {
                instante(o, r.time)
                escalar(o, r.weight.inKilograms, "kg")
            }

            is HeightRecord -> {
                instante(o, r.time)
                escalar(o, r.height.inMeters, "m")
            }

            is BodyFatRecord -> {
                instante(o, r.time)
                escalar(o, r.percentage.value, "%")
            }

            is BodyWaterMassRecord -> {
                instante(o, r.time)
                escalar(o, r.mass.inKilograms, "kg")
            }

            is BoneMassRecord -> {
                instante(o, r.time)
                escalar(o, r.mass.inKilograms, "kg")
            }

            is LeanBodyMassRecord -> {
                instante(o, r.time)
                escalar(o, r.mass.inKilograms, "kg")
            }

            is BodyTemperatureRecord -> {
                instante(o, r.time)
                escalar(o, r.temperature.inCelsius, "°C")
            }

            is BasalBodyTemperatureRecord -> {
                instante(o, r.time)
                escalar(o, r.temperature.inCelsius, "°C")
            }

            is SkinTemperatureRecord -> {
                intervalo(o, r.startTime, r.endTime)
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
            is HydrationRecord -> {
                intervalo(o, r.startTime, r.endTime)
                escalar(o, r.volume.inLiters, "L")
            }

            is NutritionRecord -> {
                intervalo(o, r.startTime, r.endTime)
                escalar(o, r.energy?.inKilocalories, "kcal")
                extra.put("proteinaG", r.protein?.inGrams)
                extra.put("gorduraG", r.totalFat?.inGrams)
                extra.put("carboidratoG", r.totalCarbohydrate?.inGrams)
                extra.put("nome", r.name)
            }

            is BloodGlucoseRecord -> {
                instante(o, r.time)
                escalar(o, r.level.inMillimolesPerLiter, "mmol/L")
            }

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
