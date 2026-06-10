---
title: "Jetpack Compose + MVVM: Guía Completa de Arquitectura Moderna"
description: "Tutorial completo para construir aplicaciones Android modernas con Jetpack Compose, MVVM, Hilt y Clean Architecture"
dateFormatted: "25 de Marzo, 2026"
category: "Android"
tags: ["Jetpack Compose", "MVVM", "Hilt", "Clean Architecture", "Kotlin", "Coroutines"]
readTime: "15 min"
difficulty: "Intermedio"
---

# Jetpack Compose + MVVM: Guía Completa de Arquitectura Moderna

En este tutorial completo, construiremos una aplicación Android moderna utilizando el stack más actual: Jetpack Compose para UI, MVVM para arquitectura, Hilt para inyección de dependencias, y Clean Architecture para separación de responsabilidades.

## 🏗️ Arquitectura del Proyecto

### Estructura de Paquetes

```
app/
├── data/
│   ├── local/
│   │   ├── database/
│   │   └── preferences/
│   ├── remote/
│   │   └── dto/
│   └── repository/
├── domain/
│   ├── model/
│   ├── repository/
│   └── usecase/
├── presentation/
│   ├── ui/
│   │   ├── components/
│   │   ├── screens/
│   │   └── theme/
│   └── viewmodel/
└── di/
```

## 🎨 Jetpack Compose UI Layer

### ViewModel con State Management

```kotlin
@HiltViewModel
class TaskViewModel @Inject constructor(
    private val getTasksUseCase: GetTasksUseCase,
    private val addTaskUseCase: AddTaskUseCase,
    private val updateTaskUseCase: UpdateTaskUseCase
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(TaskUiState())
    val uiState: StateFlow<TaskUiState> = _uiState.asStateFlow()
    
    init {
        loadTasks()
    }
    
    private fun loadTasks() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            
            getTasksUseCase().collect { result ->
                when (result) {
                    is Result.Success -> {
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            tasks = result.data,
                            error = null
                        )
                    }
                    is Result.Error -> {
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            error = result.message
                        )
                    }
                }
            }
        }
    }
    
    fun addTask(title: String, description: String) {
        viewModelScope.launch {
            val task = Task(
                title = title,
                description = description,
                createdAt = System.currentTimeMillis()
            )
            
            addTaskUseCase(task).collect { result ->
                when (result) {
                    is Result.Success -> {
                        // Task added successfully
                    }
                    is Result.Error -> {
                        _uiState.value = _uiState.value.copy(error = result.message)
                    }
                }
            }
        }
    }
}

data class TaskUiState(
    val isLoading: Boolean = false,
    val tasks: List<Task> = emptyList(),
    val error: String? = null,
    val newTaskTitle: String = "",
    val newTaskDescription: String = ""
)
```

### Composable Screen con MVVM

```kotlin
@Composable
fun TaskScreen(
    viewModel: TaskViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // Header
        TaskHeader(
            taskCount = uiState.tasks.size,
            onAddTask = { title, description ->
                viewModel.addTask(title, description)
            }
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        // Task List
        when {
            uiState.isLoading -> {
                LoadingIndicator()
            }
            uiState.error != null -> {
                ErrorMessage(
                    message = uiState.error,
                    onRetry = { viewModel.loadTasks() }
                )
            }
            else -> {
                TaskList(
                    tasks = uiState.tasks,
                    onTaskClick = { task ->
                        // Navigate to task details
                    },
                    onTaskComplete = { task ->
                        viewModel.toggleTaskCompletion(task)
                    }
                )
            }
        }
    }
}

@Composable
private fun TaskHeader(
    taskCount: Int,
    onAddTask: (String, String) -> Unit
) {
    var showAddDialog by remember { mutableStateOf(false) }
    
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column {
            Text(
                text = "Mis Tareas",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = "$taskCount tareas",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        
        FloatingActionButton(
            onClick = { showAddDialog = true },
            containerColor = MaterialTheme.colorScheme.primary
        ) {
            Icon(
                imageVector = Icons.Default.Add,
                contentDescription = "Agregar tarea"
            )
        }
    }
    
    if (showAddDialog) {
        AddTaskDialog(
            onDismiss = { showAddDialog = false },
            onAddTask = onAddTask
        )
    }
}
```

## 💉 Hilt Dependency Injection

### Módulos de Inyección

```kotlin
@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {
    
    @Provides
    @Singleton
    fun provideAppDatabase(@ApplicationContext context: Context): AppDatabase {
        return Room.databaseBuilder(
            context,
            AppDatabase::class.java,
            "tasks_database"
        ).build()
    }
    
    @Provides
    fun provideTaskDao(database: AppDatabase): TaskDao = database.taskDao()
}

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {
    
    @Provides
    @Singleton
    fun provideOkHttpClient(): OkHttpClient {
        return OkHttpClient.Builder()
            .addInterceptor(HttpLoggingInterceptor().apply {
                level = if (BuildConfig.DEBUG) {
                    HttpLoggingInterceptor.Level.BODY
                } else {
                    HttpLoggingInterceptor.Level.NONE
                }
            })
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .build()
    }
    
    @Provides
    @Singleton
    fun provideRetrofit(okHttpClient: OkHttpClient): Retrofit {
        return Retrofit.Builder()
            .baseUrl("https://api.example.com/")
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }
    
    @Provides
    @Singleton
    fun provideTaskApi(retrofit: Retrofit): TaskApi = retrofit.create(TaskApi::class.java)
}

@Module
@InstallIn(ViewModelComponent::class)
object RepositoryModule {
    
    @Provides
    @ViewModelScoped
    fun provideTaskRepository(
        taskDao: TaskDao,
        taskApi: TaskApi,
        taskMapper: TaskMapper
    ): TaskRepository {
        return TaskRepositoryImpl(taskDao, taskApi, taskMapper)
    }
}

@Module
@InstallIn(ViewModelComponent::class)
object UseCaseModule {
    
    @Provides
    @ViewModelScoped
    fun provideGetTasksUseCase(repository: TaskRepository): GetTasksUseCase {
        return GetTasksUseCase(repository)
    }
    
    @Provides
    @ViewModelScoped
    fun provideAddTaskUseCase(repository: TaskRepository): AddTaskUseCase {
        return AddTaskUseCase(repository)
    }
}
```

## 🏛️ Clean Architecture Implementation

### Domain Layer

```kotlin
// Entity
data class Task(
    val id: String = UUID.randomUUID().toString(),
    val title: String,
    val description: String,
    val isCompleted: Boolean = false,
    val createdAt: Long,
    val updatedAt: Long = System.currentTimeMillis()
)

// Repository Interface
interface TaskRepository {
    fun getTasks(): Flow<Result<List<Task>>>
    suspend fun addTask(task: Task): Result<Unit>
    suspend fun updateTask(task: Task): Result<Unit>
    suspend fun deleteTask(taskId: String): Result<Unit>
}

// Use Cases
class GetTasksUseCase @Inject constructor(
    private val repository: TaskRepository
) {
    suspend operator fun invoke(): Flow<Result<List<Task>>> {
        return repository.getTasks()
    }
}

class AddTaskUseCase @Inject constructor(
    private val repository: TaskRepository
) {
    suspend operator fun invoke(task: Task): Result<Unit> {
        return repository.addTask(task)
    }
}
```

### Data Layer Implementation

```kotlin
@Singleton
class TaskRepositoryImpl @Inject constructor(
    private val localDataSource: TaskLocalDataSource,
    private val remoteDataSource: TaskRemoteDataSource,
    private val taskMapper: TaskMapper
) : TaskRepository {
    
    override fun getTasks(): Flow<Result<List<Task>>> {
        return flow {
            try {
                // Emitir datos locales primero
                localDataSource.getTasks().collect { localTasks ->
                    emit(Result.Success(localTasks.map { taskMapper.mapToDomain(it) }))
                }
                
                // Luego sincronizar con remoto
                val remoteTasks = remoteDataSource.getTasks()
                localDataSource.syncTasks(remoteTasks)
                
                // Emitir datos actualizados
                localDataSource.getTasks().collect { localTasks ->
                    emit(Result.Success(localTasks.map { taskMapper.mapToDomain(it) }))
                }
            } catch (e: Exception) {
                emit(Result.Error(e.message ?: "Unknown error"))
            }
        }
    }
    
    override suspend fun addTask(task: Task): Result<Unit> {
        return try {
            val taskEntity = taskMapper.mapToEntity(task)
            localDataSource.addTask(taskEntity)
            
            // Sincronizar con servidor
            remoteDataSource.addTask(task)
            Result.Success(Unit)
        } catch (e: Exception) {
            Result.Error(e.message ?: "Failed to add task")
        }
    }
}
```

## ⚡ Coroutines y Flow

### Manejo de Estado Reactivo

```kotlin
@Composable
fun ReactiveTaskList(
    viewModel: TaskViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    
    // Efectos secundarios
    LaunchedEffect(uiState.error) {
        if (uiState.error != null) {
            // Mostrar snackbar de error
        }
    }
    
    // UI State Management
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(
            items = uiState.tasks,
            key = { it.id }
        ) { task ->
            TaskItem(
                task = task,
                onToggleComplete = {
                    viewModel.toggleTaskCompletion(task)
                },
                onDelete = {
                    viewModel.deleteTask(task.id)
                }
            )
        }
    }
}

@Composable
private fun TaskItem(
    task: Task,
    onToggleComplete: () -> Unit,
    onDelete: () -> Unit
) {
    var isDeleting by remember { mutableStateOf(false) }
    
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .animateContentSize(),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Task Content
                Column(
                    modifier = Modifier.weight(1f)
                ) {
                    Text(
                        text = task.title,
                        style = MaterialTheme.typography.titleMedium,
                        textDecoration = if (task.isCompleted) {
                            TextDecoration.LineThrough
                        } else null
                    )
                    
                    if (task.description.isNotEmpty()) {
                        Text(
                            text = task.description,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
                
                // Actions
                Row {
                    IconButton(onClick = onToggleComplete) {
                        Icon(
                            imageVector = if (task.isCompleted) {
                                Icons.Default.CheckCircle
                            } else {
                                Icons.Default.CheckCircleOutline
                            },
                            contentDescription = if (task.isCompleted) {
                                "Marcar como incompleta"
                            } else {
                                "Marcar como completada"
                            },
                            tint = if (task.isCompleted) {
                                MaterialTheme.colorScheme.primary
                            } else {
                                MaterialTheme.colorScheme.onSurface
                            }
                        )
                    }
                    
                    IconButton(onClick = onDelete) {
                        Icon(
                            imageVector = Icons.Default.Delete,
                            contentDescription = "Eliminar tarea",
                            tint = MaterialTheme.colorScheme.error
                        )
                    }
                }
            }
        }
    }
}
```

## 🧪 Testing con MockK

### Unit Tests para ViewModel

```kotlin
@ExperimentalCoroutinesApi
class TaskViewModelTest {
    
    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()
    
    private lateinit var viewModel: TaskViewModel
    private lateinit var getTasksUseCase: GetTasksUseCase
    private lateinit var addTaskUseCase: AddTaskUseCase
    
    @Before
    fun setup() {
        getTasksUseCase = mockk()
        addTaskUseCase = mockk()
        viewModel = TaskViewModel(getTasksUseCase, addTaskUseCase, mockk())
    }
    
    @Test
    fun `when load tasks, should update ui state with tasks`() = runTest {
        // Given
        val tasks = listOf(
            Task("1", "Task 1", "Description 1"),
            Task("2", "Task 2", "Description 2")
        )
        every { getTasksUseCase() } returns flowOf(Result.Success(tasks))
        
        // When
        viewModel.loadTasks()
        
        // Then
        assertEquals(tasks, viewModel.uiState.value.tasks)
        assertFalse(viewModel.uiState.value.isLoading)
        assertNull(viewModel.uiState.value.error)
    }
    
    @Test
    fun `when add task, should call use case and update state`() = runTest {
        // Given
        val title = "New Task"
        val description = "New Description"
        coEvery { addTaskUseCase(any()) } returns flowOf(Result.Success(Unit))
        
        // When
        viewModel.addTask(title, description)
        
        // Then
        coVerify { addTaskUseCase(match<Task> { 
            it.title == title && it.description == description 
        }) }
    }
}
```

## 🎯 Material Design 3 Theme

```kotlin
@Composable
fun TaskAppTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = true,
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) 
            else dynamicLightColorScheme(context)
        }
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }
    
    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
```

## 🚀 Conclusión

Esta arquitectura moderna proporciona:

- ✅ **Separación clara** de responsabilidades con Clean Architecture
- ✅ **UI reactiva** con Jetpack Compose y StateFlow
- ✅ **Inyección de dependencias** automatizada con Hilt
- ✅ **Testing completo** con MockK y JUnit
- ✅ **Código mantenible** y escalable
- ✅ **Performance óptima** con Coroutines y Flow

Este stack representa el estado del arte en desarrollo Android moderno, listo para aplicaciones empresariales y proyectos ambiciosos.
