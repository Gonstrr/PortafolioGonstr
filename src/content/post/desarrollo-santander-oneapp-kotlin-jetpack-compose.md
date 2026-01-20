---
layout: ../../layouts/post.astro
title: Desarrollo de Santander OneApp con Kotlin y Jetpack Compose
description: Mi experiencia desarrollando la nueva aplicación bancaria móvil de Santander utilizando arquitectura modular, MVVM y tecnologías modernas de Android
dateFormatted: Enero 17, 2025
category: Mobile
tags: [Android, Kotlin, Jetpack Compose, MVVM, Banking]
readTime: 8 min
difficulty: Avanzado
---

Durante mi experiencia como desarrollador Android en el equipo de Santander OneApp, he tenido la oportunidad de participar en la creación y evolución de una de las aplicaciones bancarias más importantes de Chile. Este proyecto ha sido un desafío técnico fascinante que me ha permitido trabajar con las tecnologías más modernas del ecosistema Android.

## 🏗️ Arquitectura Modular y Escalabilidad

Uno de los aspectos más interesantes del proyecto ha sido la implementación de una **arquitectura modular robusta**. La aplicación está construida siguiendo principios de separación de responsabilidades, donde cada módulo tiene un propósito específico y bien definido.

### Patrón MVVM en Práctica

La implementación del patrón **Model-View-ViewModel (MVVM)** ha sido fundamental para mantener la escalabilidad del proyecto:

```kotlin
// Ejemplo simplificado de ViewModel
class TransactionViewModel @Inject constructor(
    private val transactionRepository: TransactionRepository,
    private val analyticsManager: AnalyticsManager
) : ViewModel() {
    
    private val _transactionState = MutableStateFlow(TransactionUiState.Loading)
    val transactionState = _transactionState.asStateFlow()
    
    fun loadTransactions() {
        viewModelScope.launch {
            try {
                val transactions = transactionRepository.getTransactions()
                _transactionState.value = TransactionUiState.Success(transactions)
                analyticsManager.trackEvent("transactions_loaded")
            } catch (exception: Exception) {
                _transactionState.value = TransactionUiState.Error(exception.message)
            }
        }
    }
}
```

## 🎨 Jetpack Compose: UI Moderna y Declarativa

La migración hacia **Jetpack Compose** ha sido uno de los aspectos más emocionantes del desarrollo. La capacidad de crear interfaces de usuario declarativas ha mejorado significativamente la productividad del equipo:

```kotlin
@Composable
fun TransactionCard(
    transaction: Transaction,
    onTransactionClick: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable { onTransactionClick(transaction.id) },
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Text(
                text = transaction.description,
                style = MaterialTheme.typography.titleMedium
            )
            Text(
                text = transaction.formattedAmount,
                style = MaterialTheme.typography.bodyLarge,
                color = if (transaction.isCredit) Color.Green else Color.Red
            )
        }
    }
}
```

## 💉 Inyección de Dependencias con Hilt

La gestión eficiente del ciclo de vida y la testabilidad del código se logró mediante **Hilt (Dagger)**:

```kotlin
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {
    
    @Provides
    @Singleton
    fun provideOkHttpClient(): OkHttpClient {
        return OkHttpClient.Builder()
            .addInterceptor(AuthenticationInterceptor())
            .addInterceptor(LoggingInterceptor())
            .connectTimeout(30, TimeUnit.SECONDS)
            .build()
    }
    
    @Provides
    @Singleton
    fun provideApiService(okHttpClient: OkHttpClient): ApiService {
        return Retrofit.Builder()
            .client(okHttpClient)
            .baseUrl(BuildConfig.API_BASE_URL)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(ApiService::class.java)
    }
}
```

## 🔗 Integración de SDKs y Comunicación Entre Módulos

Un aspecto crítico del desarrollo bancario es la **integración de SDKs de seguridad** y el manejo de comunicación entre diferentes módulos:

### Registro Biométrico
```kotlin
class BiometricManager @Inject constructor(
    private val biometricPrompt: BiometricPrompt,
    private val securityRepository: SecurityRepository
) {
    
    fun authenticateUser(
        onSuccess: () -> Unit,
        onError: (String) -> Unit
    ) {
        val promptInfo = BiometricPrompt.PromptInfo.Builder()
            .setTitle("Autenticación Biométrica")
            .setSubtitle("Utiliza tu huella dactilar para continuar")
            .setNegativeButtonText("Cancelar")
            .build()
            
        biometricPrompt.authenticate(promptInfo)
    }
}
```

### Product Flavors y Build Variants

La gestión de múltiples entornos es esencial en aplicaciones bancarias:

```groovy
android {
    flavorDimensions "environment"
    
    productFlavors {
        development {
            dimension "environment"
            applicationIdSuffix ".dev"
            buildConfigField "String", "API_BASE_URL", "\"https://api-dev.santander.cl\""
            buildConfigField "boolean", "DEBUG_ENABLED", "true"
        }
        
        staging {
            dimension "environment"
            applicationIdSuffix ".staging"
            buildConfigField "String", "API_BASE_URL", "\"https://api-staging.santander.cl\""
            buildConfigField "boolean", "DEBUG_ENABLED", "false"
        }
        
        production {
            dimension "environment"
            buildConfigField "String", "API_BASE_URL", "\"https://api.santander.cl\""
            buildConfigField "boolean", "DEBUG_ENABLED", "false"
        }
    }
}
```

## 🌐 Integración Web-Mobile con Ionic y Capacitor

Una parte interesante del proyecto ha sido la **integración de componentes web** dentro de la aplicación nativa:

```kotlin
@Composable
fun WebViewScreen(
    url: String,
    onNavigationComplete: () -> Unit
) {
    AndroidView(
        factory = { context ->
            WebView(context).apply {
                webViewClient = object : WebViewClient() {
                    override fun onPageFinished(view: WebView?, url: String?) {
                        onNavigationComplete()
                    }
                }
                settings.javaScriptEnabled = true
                settings.domStorageEnabled = true
            }
        },
        update = { webView ->
            webView.loadUrl(url)
        }
    )
}
```

## 🚀 CI/CD con Bitrise

La automatización del proceso de desarrollo mediante **Bitrise** ha sido crucial para mantener la calidad y velocidad de entrega:

```yaml
# bitrise.yml (simplificado)
workflows:
  deploy:
    steps:
    - activate-ssh-key:
        run_if: '{{getenv "SSH_RSA_PRIVATE_KEY" | ne ""}}'
    - git-clone: {}
    - cache-pull: {}
    - install-missing-android-tools: {}
    - android-build:
        inputs:
        - variant: release
        - build_type: aab
    - google-play-deploy:
        inputs:
        - track: internal
        - service_account_json_key_path: "$GOOGLE_PLAY_SERVICE_ACCOUNT_KEY"
```

## 📊 Análisis Estático con Detekt

La implementación de **análisis estático de código** ha mejorado significativamente la calidad del código:

```kotlin
// detekt.yml configuración
complexity:
  ComplexMethod:
    threshold: 15
  LongParameterList:
    functionThreshold: 6
    constructorThreshold: 7
    
style:
  MaxLineLength:
    maxLineLength: 120
  ForbiddenComment:
    values: ['TODO:', 'FIXME:', 'STOPSHIP:']
```

## 🌍 Colaboración Internacional

Trabajar con equipos distribuidos entre **Chile y España** ha enriquecido enormemente la experiencia. Las daily meetings remotas y el trabajo asincrónico han requerido:

- Documentación técnica exhaustiva en **Confluence**
- Comunicación clara y proactiva
- Gestión eficiente de diferentes zonas horarias
- Uso de herramientas colaborativas como **Microsoft Loop**

## 🎯 Conclusiones y Aprendizajes

El desarrollo de Santander OneApp ha sido una experiencia transformadora que me ha permitido:

1. **Dominar Jetpack Compose** en un entorno de producción real
2. **Implementar arquitecturas escalables** en aplicaciones de gran complejidad
3. **Trabajar con estándares bancarios** de seguridad y calidad
4. **Colaborar efectivamente** en equipos distribuidos internacionalmente
5. **Automatizar procesos** críticos de desarrollo y despliegue

La combinación de tecnologías modernas como Kotlin, Jetpack Compose, y herramientas de automatización como Bitrise, junto con prácticas sólidas de arquitectura y testing, han resultado en una aplicación robusta y mantenible que sirve a millones de usuarios.

Este proyecto no solo ha sido técnicamente desafiante, sino que también ha tenido un impacto real en la experiencia digital de los clientes del banco, lo cual hace que cada línea de código tenga un propósito significativo.

---

*¿Te interesa saber más sobre desarrollo Android moderno o arquitecturas escalables? Sígueme en [GitHub](https://github.com/Gonstrr) para más contenido técnico.*