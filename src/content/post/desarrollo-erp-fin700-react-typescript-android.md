---
layout: ../../layouts/post.astro
title: Mi Experiencia Desarrollando el ERP Fin700 con React y TypeScript
description: Cómo desarrollé componentes para el sistema ERP bancario Fin700 utilizando React, TypeScript y arquitectura modular, junto con una aplicación Android nativa
dateFormatted: Septiembre 20, 2024
category: Frontend
tags: [React, TypeScript, ERP, Android, Kotlin, MVVM]
readTime: 6 min
difficulty: Intermedio
---

Durante mi tiempo como Desarrollador de Software en **Sonda S.A.** (Mayo 2023 - Septiembre 2024), tuve la oportunidad de trabajar en uno de los sistemas ERP más importantes del sector financiero chileno: **Fin700**. Esta experiencia me permitió crecer tanto en el desarrollo frontend como en aplicaciones móviles nativas.

## 🏦 ¿Qué es Fin700?

Fin700 es un sistema ERP (Enterprise Resource Planning) diseñado específicamente para el sector financiero. Es utilizado por bancos y instituciones financieras para gestionar operaciones críticas como:

- Gestión de cuentas y clientes
- Procesamiento de transacciones
- Reportería financiera
- Cumplimiento normativo
- Análisis de riesgo

## 🛠️ Stack Tecnológico Frontend

El desarrollo de componentes para Fin700 utilizó tecnologías modernas que garantizaban escalabilidad y mantenibilidad:

### React con TypeScript

La combinación de **React** y **TypeScript** fue fundamental para crear componentes robustos y type-safe:

```typescript
interface TransactionFormProps {
  onSubmit: (transaction: TransactionData) => Promise<void>;
  initialData?: Partial<TransactionData>;
  isLoading: boolean;
}

const TransactionForm: React.FC<TransactionFormProps> = ({
  onSubmit,
  initialData,
  isLoading
}) => {
  const [formData, setFormData] = useState<TransactionData>({
    amount: initialData?.amount ?? 0,
    currency: initialData?.currency ?? 'CLP',
    description: initialData?.description ?? '',
    accountId: initialData?.accountId ?? '',
    ...
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSubmit(formData);
      toast.success('Transacción procesada correctamente');
    } catch (error) {
      toast.error('Error al procesar la transacción');
      console.error('Transaction error:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="transaction-form">
      {/* Campos del formulario */}
    </form>
  );
};
```

### Arquitectura de Componentes

La arquitectura seguía principios de **composición** y **reutilización**:

```typescript
// Componente base reutilizable
interface DataTableProps<T> {
  data: T[];
  columns: ColumnDefinition<T>[];
  onRowClick?: (item: T) => void;
  loading?: boolean;
  pagination?: PaginationConfig;
}

export const DataTable = <T,>({
  data,
  columns,
  onRowClick,
  loading,
  pagination
}: DataTableProps<T>) => {
  // Lógica de tabla genérica
};

// Implementación específica para transacciones
const TransactionTable = () => {
  const columns: ColumnDefinition<Transaction>[] = [
    {
      key: 'date',
      label: 'Fecha',
      render: (transaction) => formatDate(transaction.date)
    },
    {
      key: 'amount',
      label: 'Monto',
      render: (transaction) => formatCurrency(transaction.amount)
    }
  ];

  return (
    <DataTable
      data={transactions}
      columns={columns}
      onRowClick={handleTransactionClick}
      loading={isLoading}
    />
  );
};
```

## 📱 Aplicación Android Nativa con Kotlin

Paralelamente, desarrollé una **aplicación Android nativa** que complementaba el sistema ERP, utilizando las mejores prácticas de desarrollo móvil.

### Arquitectura MVVM

La implementación siguió el patrón **Model-View-ViewModel** con **Clean Architecture**:

```kotlin
// Repository Layer
class TransactionRepository @Inject constructor(
    private val apiService: ApiService,
    private val transactionDao: TransactionDao
) {
    suspend fun getTransactions(): Flow<List<Transaction>> {
        return flow {
            try {
                val remoteTransactions = apiService.getTransactions()
                transactionDao.insertAll(remoteTransactions)
                emit(remoteTransactions)
            } catch (exception: Exception) {
                // Fallback a datos locales
                emit(transactionDao.getAllTransactions())
            }
        }
    }
}

// ViewModel Layer
class TransactionViewModel @Inject constructor(
    private val repository: TransactionRepository
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(TransactionUiState())
    val uiState: StateFlow<TransactionUiState> = _uiState.asStateFlow()
    
    fun loadTransactions() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            
            repository.getTransactions()
                .catch { exception ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = exception.message
                        )
                    }
                }
                .collect { transactions ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            transactions = transactions,
                            error = null
                        )
                    }
                }
        }
    }
}
```

### Material Design y UI

La interfaz seguía las guidelines de **Material Design** para una experiencia consistente:

```kotlin
@Composable
fun TransactionCard(
    transaction: Transaction,
    onCardClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable { onCardClick() },
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        )
    ) {
        Column(
            modifier = Modifier
                .padding(16.dp)
                .fillMaxWidth()
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = transaction.description,
                    style = MaterialTheme.typography.titleMedium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                
                Text(
                    text = formatCurrency(transaction.amount),
                    style = MaterialTheme.typography.titleMedium,
                    color = if (transaction.amount >= 0) 
                        Color(0xFF4CAF50) else Color(0xFFF44336)
                )
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Text(
                text = formatDate(transaction.date),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}
```

## 🔗 Integración con APIs REST

La comunicación con el backend se realizaba mediante **Retrofit** con manejo robusto de errores:

```kotlin
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {
    
    @Provides
    @Singleton
    fun provideOkHttpClient(): OkHttpClient {
        return OkHttpClient.Builder()
            .addInterceptor(AuthInterceptor())
            .addInterceptor(HttpLoggingInterceptor().apply {
                level = if (BuildConfig.DEBUG) 
                    HttpLoggingInterceptor.Level.BODY 
                else HttpLoggingInterceptor.Level.NONE
            })
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .build()
    }
    
    @Provides
    @Singleton
    fun provideApiService(okHttpClient: OkHttpClient): ApiService {
        return Retrofit.Builder()
            .client(okHttpClient)
            .baseUrl(BuildConfig.BASE_URL)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(ApiService::class.java)
    }
}

interface ApiService {
    @GET("transactions")
    suspend fun getTransactions(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): Response<TransactionResponse>
    
    @POST("transactions")
    suspend fun createTransaction(
        @Body transaction: CreateTransactionRequest
    ): Response<Transaction>
}
```

## 🧪 Testing y Calidad de Código

La calidad del código era fundamental en un entorno financiero:

```kotlin
@ExperimentalCoroutinesApi
class TransactionViewModelTest {
    
    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()
    
    private val mockRepository = mockk<TransactionRepository>()
    private lateinit var viewModel: TransactionViewModel
    
    @Before
    fun setup() {
        viewModel = TransactionViewModel(mockRepository)
    }
    
    @Test
    fun `loadTransactions should update state correctly on success`() = runTest {
        // Given
        val expectedTransactions = listOf(
            Transaction(id = "1", amount = 1000.0, description = "Test")
        )
        coEvery { mockRepository.getTransactions() } returns flowOf(expectedTransactions)
        
        // When
        viewModel.loadTransactions()
        
        // Then
        val finalState = viewModel.uiState.value
        assertFalse(finalState.isLoading)
        assertEquals(expectedTransactions, finalState.transactions)
        assertNull(finalState.error)
    }
}
```

## 📊 Impacto y Resultados

Durante mi tiempo en el proyecto Fin700:

- **Desarrollé más de 20 componentes** React reutilizables
- **Reduje el tiempo de desarrollo** de nuevas funcionalidades en un 30%
- **Implementé una aplicación móvil** que mejoró la eficiencia operacional
- **Mantuve 0 bugs críticos** en producción durante 6 meses
- **Colaboré con un equipo de 8 desarrolladores** de manera efectiva

## 🎯 Aprendizajes Clave

Esta experiencia me permitió:

1. **Dominar TypeScript** en aplicaciones empresariales complejas
2. **Aplicar patrones de arquitectura** tanto en web como móvil
3. **Trabajar en el sector financiero** con sus estrictos requisitos de calidad
4. **Desarrollar aplicaciones híbridas** que se complementan entre plataformas
5. **Implementar testing exhaustivo** para aplicaciones críticas

## 🔮 Reflexión Final

El desarrollo del ERP Fin700 fue una experiencia fundamental que consolidó mi expertise tanto en desarrollo frontend moderno como en aplicaciones móviles nativas. Trabajar en el sector financiero me enseñó la importancia de escribir código robusto, testeable y mantenible.

La combinación de React/TypeScript para el frontend y Kotlin/Android nativo me dio una perspectiva completa del desarrollo de aplicaciones empresariales modernas, preparándome para los desafíos tecnológicos actuales.

---

*¿Quieres saber más sobre desarrollo en el sector financiero o arquitecturas enterprise? Conecta conmigo en [GitHub](https://github.com/Gonstrr).*