---
title: "Testing Completo en Android: Unit, Integration y UI Tests con Jetpack Compose"
description: "Guía exhaustiva de testing en aplicaciones Android modernas con MockK, JUnit, Espresso y Compose Testing"
dateFormatted: "30 de Marzo, 2026"
category: "Android"
tags: ["Testing", "MockK", "JUnit", "Espresso", "Compose Testing", "Turbine"]
readTime: "12 min"
difficulty: "Avanzado"
---

# Testing Completo en Android: Unit, Integration y UI Tests con Jetpack Compose

El testing es fundamental para aplicaciones Android robustas y mantenibles. En esta guía completa, exploraremos todas las capas de testing para aplicaciones modernas con Jetpack Compose, MVVM y Clean Architecture.

## 🏗️ Estrategia de Testing Pyramid

### Testing Pyramid Structure

```
        E2E Tests (5%)
       ─────────────────
      Integration Tests (15%)
     ─────────────────────────
    Unit Tests (80%)
   ──────────────────────────────
```

## 🧪 Unit Tests con MockK

### Repository Layer Testing

```kotlin
@ExperimentalCoroutinesApi
class TaskRepositoryImplTest {
    
    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()
    
    private lateinit var repository: TaskRepositoryImpl
    private lateinit var localDataSource: TaskLocalDataSource
    private lateinit var remoteDataSource: TaskRemoteDataSource
    private lateinit var taskMapper: TaskMapper
    
    @Before
    fun setup() {
        localDataSource = mockk(relaxed = true)
        remoteDataSource = mockk(relaxed = true)
        taskMapper = mockk()
        repository = TaskRepositoryImpl(localDataSource, remoteDataSource, taskMapper)
    }
    
    @Test
    fun `getTasks should return local tasks first`() = runTest {
        // Given
        val localTasks = listOf(
            TaskEntity("1", "Task 1", "Desc 1", false, 123456789),
            TaskEntity("2", "Task 2", "Desc 2", true, 123456790)
        )
        val expectedTasks = listOf(
            Task("1", "Task 1", "Desc 1", false, 123456789),
            Task("2", "Task 2", "Desc 2", true, 123456790)
        )
        
        every { localDataSource.getTasks() } returns flowOf(localTasks)
        every { taskMapper.mapToDomain(any()) } returnsMany expectedTasks
        
        // When
        val result = repository.getTasks().first()
        
        // Then
        assertTrue(result is Result.Success)
        assertEquals(expectedTasks, (result as Result.Success).data)
        verify { localDataSource.getTasks() }
    }
    
    @Test
    fun `addTask should save locally and sync with remote`() = runTest {
        // Given
        val task = Task("1", "New Task", "Description", false, 123456789)
        val taskEntity = TaskEntity("1", "New Task", "Description", false, 123456789)
        
        every { taskMapper.mapToEntity(task) } returns taskEntity
        every { localDataSource.addTask(taskEntity) } just Runs
        coEvery { remoteDataSource.addTask(task) } returns Result.success(Unit)
        
        // When
        val result = repository.addTask(task)
        
        // Then
        assertTrue(result is Result.Success)
        verify { localDataSource.addTask(taskEntity) }
        coVerify { remoteDataSource.addTask(task) }
    }
    
    @Test
    fun `addTask should return error when remote sync fails`() = runTest {
        // Given
        val task = Task("1", "New Task", "Description", false, 123456789)
        val taskEntity = TaskEntity("1", "New Task", "Description", false, 123456789)
        val errorMessage = "Network error"
        
        every { taskMapper.mapToEntity(task) } returns taskEntity
        every { localDataSource.addTask(taskEntity) } just Runs
        coEvery { remoteDataSource.addTask(task) } throws IOException(errorMessage)
        
        // When
        val result = repository.addTask(task)
        
        // Then
        assertTrue(result is Result.Error)
        assertEquals(errorMessage, (result as Result.Error).message)
    }
}
```

### ViewModel Testing con Turbine

```kotlin
@ExperimentalCoroutinesApi
class TaskViewModelTest {
    
    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()
    
    private lateinit var viewModel: TaskViewModel
    private lateinit var getTasksUseCase: GetTasksUseCase
    private lateinit var addTaskUseCase: AddTaskUseCase
    private lateinit var updateTaskUseCase: UpdateTaskUseCase
    
    @Before
    fun setup() {
        getTasksUseCase = mockk()
        addTaskUseCase = mockk()
        updateTaskUseCase = mockk()
        viewModel = TaskViewModel(getTasksUseCase, addTaskUseCase, updateTaskUseCase)
    }
    
    @Test
    fun `initial state should be loading`() = runTest {
        // Given
        every { getTasksUseCase() } returns flowOf(Result.Success(emptyList()))
        
        // When
        val viewModel = TaskViewModel(getTasksUseCase, addTaskUseCase, updateTaskUseCase)
        
        // Then
        val initialState = viewModel.uiState.value
        assertTrue(initialState.isLoading)
        assertTrue(initialState.tasks.isEmpty())
        assertNull(initialState.error)
    }
    
    @Test
    fun `load tasks should update ui state correctly`() = runTest {
        // Given
        val tasks = listOf(
            Task("1", "Task 1", "Description 1"),
            Task("2", "Task 2", "Description 2")
        )
        every { getTasksUseCase() } returns flowOf(Result.Success(tasks))
        
        // When
        viewModel.loadTasks()
        
        // Then
        val state = viewModel.uiState.value
        assertFalse(state.isLoading)
        assertEquals(tasks, state.tasks)
        assertNull(state.error)
    }
    
    @Test
    fun `load tasks should handle error correctly`() = runTest {
        // Given
        val errorMessage = "Network error"
        every { getTasksUseCase() } returns flowOf(Result.Error(errorMessage))
        
        // When
        viewModel.loadTasks()
        
        // Then
        val state = viewModel.uiState.value
        assertFalse(state.isLoading)
        assertTrue(state.tasks.isEmpty())
        assertEquals(errorMessage, state.error)
    }
    
    @Test
    fun `add task should call use case and update state`() = runTest {
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
    
    @Test
    fun `add task should handle error`() = runTest {
        // Given
        val title = "New Task"
        val description = "New Description"
        val errorMessage = "Failed to add task"
        
        coEvery { addTaskUseCase(any()) } returns flowOf(Result.Error(errorMessage))
        
        // When
        viewModel.addTask(title, description)
        
        // Then
        val state = viewModel.uiState.value
        assertEquals(errorMessage, state.error)
    }
}
```

### Use Case Testing

```kotlin
class GetTasksUseCaseTest {
    
    private lateinit var useCase: GetTasksUseCase
    private lateinit var repository: TaskRepository
    
    @Before
    fun setup() {
        repository = mockk()
        useCase = GetTasksUseCase(repository)
    }
    
    @Test
    fun `invoke should return tasks from repository`() = runTest {
        // Given
        val tasks = listOf(
            Task("1", "Task 1", "Description 1"),
            Task("2", "Task 2", "Description 2")
        )
        every { repository.getTasks() } returns flowOf(Result.Success(tasks))
        
        // When
        val result = useCase().first()
        
        // Then
        assertTrue(result is Result.Success)
        assertEquals(tasks, (result as Result.Success).data)
        verify { repository.getTasks() }
    }
    
    @Test
    fun `invoke should handle repository error`() = runTest {
        // Given
        val errorMessage = "Repository error"
        every { repository.getTasks() } returns flowOf(Result.Error(errorMessage))
        
        // When
        val result = useCase().first()
        
        // Then
        assertTrue(result is Result.Error)
        assertEquals(errorMessage, (result as Result.Error).message)
    }
}
```

## 🔄 Integration Tests

### Database Integration Testing

```kotlin
@RunWith(AndroidJUnit4::class)
class TaskDaoTest {
    
    private lateinit var database: AppDatabase
    private lateinit var taskDao: TaskDao
    
    @get:Rule
    val instantTaskExecutorRule = InstantTaskExecutorRule()
    
    @Before
    fun setup() {
        database = Room.inMemoryDatabaseBuilder(
            ApplicationProvider.getApplicationContext(),
            AppDatabase::class.java
        ).allowMainThreadQueries().build()
        
        taskDao = database.taskDao()
    }
    
    @After
    fun tearDown() {
        database.close()
    }
    
    @Test
    fun insertAndGetTask() = runTest {
        // Given
        val task = TaskEntity(
            id = "1",
            title = "Test Task",
            description = "Test Description",
            isCompleted = false,
            createdAt = System.currentTimeMillis()
        )
        
        // When
        taskDao.insertTask(task)
        val retrievedTask = taskDao.getTaskById("1").first()
        
        // Then
        assertEquals(task, retrievedTask)
    }
    
    @Test
    fun updateTask() = runTest {
        // Given
        val task = TaskEntity(
            id = "1",
            title = "Test Task",
            description = "Test Description",
            isCompleted = false,
            createdAt = System.currentTimeMillis()
        )
        taskDao.insertTask(task)
        
        val updatedTask = task.copy(
            title = "Updated Task",
            isCompleted = true
        )
        
        // When
        taskDao.updateTask(updatedTask)
        val retrievedTask = taskDao.getTaskById("1").first()
        
        // Then
        assertEquals("Updated Task", retrievedTask?.title)
        assertTrue(retrievedTask?.isCompleted == true)
    }
    
    @Test
    fun deleteTask() = runTest {
        // Given
        val task = TaskEntity(
            id = "1",
            title = "Test Task",
            description = "Test Description",
            isCompleted = false,
            createdAt = System.currentTimeMillis()
        )
        taskDao.insertTask(task)
        
        // When
        taskDao.deleteTask("1")
        val retrievedTask = taskDao.getTaskById("1").first()
        
        // Then
        assertNull(retrievedTask)
    }
    
    @Test
    fun getAllTasks() = runTest {
        // Given
        val tasks = listOf(
            TaskEntity("1", "Task 1", "Desc 1", false, 123456789),
            TaskEntity("2", "Task 2", "Desc 2", true, 123456790)
        )
        tasks.forEach { taskDao.insertTask(it) }
        
        // When
        val retrievedTasks = taskDao.getAllTasks().first()
        
        // Then
        assertEquals(tasks.size, retrievedTasks.size)
        assertTrue(retrievedTasks.containsAll(tasks))
    }
}
```

### API Integration Testing

```kotlin
@RunWith(AndroidJUnit4::class)
class TaskApiTest {
    
    private lateinit var mockWebServer: MockWebServer
    private lateinit var api: TaskApi
    
    @Before
    fun setup() {
        mockWebServer = MockWebServer()
        api = Retrofit.Builder()
            .baseUrl(mockWebServer.url("/"))
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(TaskApi::class.java)
    }
    
    @After
    fun tearDown() {
        mockWebServer.shutdown()
    }
    
    @Test
    fun getTasks_success() = runTest {
        // Given
        val mockResponse = """
        [
            {
                "id": "1",
                "title": "Task 1",
                "description": "Description 1",
                "isCompleted": false,
                "createdAt": 1234567890000
            },
            {
                "id": "2",
                "title": "Task 2",
                "description": "Description 2",
                "isCompleted": true,
                "createdAt": 1234567900000
            }
        ]
        """.trimIndent()
        
        mockWebServer.enqueue(
            MockResponse()
                .setBody(mockResponse)
                .addHeader("Content-Type", "application/json")
        )
        
        // When
        val response = api.getTasks()
        
        // Then
        assertEquals(200, response.code())
        assertEquals(2, response.body()?.size)
        assertEquals("Task 1", response.body()?.get(0)?.title)
        assertEquals("Task 2", response.body()?.get(1)?.title)
    }
    
    @Test
    fun getTasks_error() = runTest {
        // Given
        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(500)
                .setBody("Internal Server Error")
        )
        
        // When
        val response = api.getTasks()
        
        // Then
        assertEquals(500, response.code())
    }
    
    @Test
    fun addTask_success() = runTest {
        // Given
        val task = TaskDto(
            id = "1",
            title = "New Task",
            description = "New Description",
            isCompleted = false,
            createdAt = System.currentTimeMillis()
        )
        
        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(201)
                .setBody("{}")
                .addHeader("Content-Type", "application/json")
        )
        
        // When
        val response = api.addTask(task)
        
        // Then
        assertEquals(201, response.code())
    }
}
```

## 📱 UI Tests con Espresso y Compose Testing

### Compose UI Testing

```kotlin
@RunWith(AndroidJUnit4::class)
class TaskScreenTest {
    
    @get:Rule
    val composeTestRule = createComposeRule()
    
    private lateinit var viewModel: TaskViewModel
    
    @Before
    fun setup() {
        viewModel = mockk(relaxed = true)
    }
    
    @Test
    fun taskScreen_displaysLoadingIndicator() {
        // Given
        every { viewModel.uiState } returns MutableStateFlow(
            TaskUiState(isLoading = true)
        ).asStateFlow()
        
        // When
        composeTestRule.setContent {
            TaskScreen(viewModel = viewModel)
        }
        
        // Then
        composeTestRule
            .onNodeWithContentDescription("Loading")
            .assertIsDisplayed()
    }
    
    @Test
    fun taskScreen_displaysTasks() {
        // Given
        val tasks = listOf(
            Task("1", "Task 1", "Description 1"),
            Task("2", "Task 2", "Description 2")
        )
        every { viewModel.uiState } returns MutableStateFlow(
            TaskUiState(tasks = tasks)
        ).asStateFlow()
        
        // When
        composeTestRule.setContent {
            TaskScreen(viewModel = viewModel)
        }
        
        // Then
        composeTestRule
            .onNodeWithText("Task 1")
            .assertIsDisplayed()
        
        composeTestRule
            .onNodeWithText("Task 2")
            .assertIsDisplayed()
        
        composeTestRule
            .onNodeWithText("Description 1")
            .assertIsDisplayed()
    }
    
    @Test
    fun taskScreen_displaysErrorMessage() {
        // Given
        val errorMessage = "Network error"
        every { viewModel.uiState } returns MutableStateFlow(
            TaskUiState(error = errorMessage)
        ).asStateFlow()
        
        // When
        composeTestRule.setContent {
            TaskScreen(viewModel = viewModel)
        }
        
        // Then
        composeTestRule
            .onNodeWithText(errorMessage)
            .assertIsDisplayed()
    }
    
    @Test
    fun taskScreen_addTask_opensDialog() {
        // Given
        every { viewModel.uiState } returns MutableStateFlow(
            TaskUiState()
        ).asStateFlow()
        
        // When
        composeTestRule.setContent {
            TaskScreen(viewModel = viewModel)
        }
        
        composeTestRule
            .onNodeWithContentDescription("Add task")
            .performClick()
        
        // Then
        composeTestRule
            .onNodeWithText("Add New Task")
            .assertIsDisplayed()
    }
    
    @Test
    fun taskScreen_toggleTaskCompletion() {
        // Given
        val tasks = listOf(
            Task("1", "Task 1", "Description 1", isCompleted = false)
        )
        every { viewModel.uiState } returns MutableStateFlow(
            TaskUiState(tasks = tasks)
        ).asStateFlow()
        
        // When
        composeTestRule.setContent {
            TaskScreen(viewModel = viewModel)
        }
        
        composeTestRule
            .onNodeWithContentDescription("Mark as complete")
            .performClick()
        
        // Then
        verify { viewModel.toggleTaskCompletion(tasks.first()) }
    }
}
```

### Custom Composable Testing

```kotlin
@RunWith(AndroidJUnit4::class)
class TaskItemTest {
    
    @get:Rule
    val composeTestRule = createComposeRule()
    
    @Test
    fun taskItem_displaysTaskInformation() {
        // Given
        val task = Task(
            id = "1",
            title = "Test Task",
            description = "Test Description",
            isCompleted = false
        )
        
        // When
        composeTestRule.setContent {
            TaskItem(
                task = task,
                onToggleComplete = { },
                onDelete = { }
            )
        }
        
        // Then
        composeTestRule
            .onNodeWithText("Test Task")
            .assertIsDisplayed()
        
        composeTestRule
            .onNodeWithText("Test Description")
            .assertIsDisplayed()
    }
    
    @Test
    fun taskItem_completedTask_showsStrikethrough() {
        // Given
        val task = Task(
            id = "1",
            title = "Completed Task",
            description = "Description",
            isCompleted = true
        )
        
        // When
        composeTestRule.setContent {
            TaskItem(
                task = task,
                onToggleComplete = { },
                onDelete = { }
            )
        }
        
        // Then
        composeTestRule
            .onNodeWithText("Completed Task")
            .assert(
                hasTextDecoration(TextDecoration.LineThrough)
            )
    }
    
    @Test
    fun taskItem_clickComplete_callsCallback() {
        // Given
        val task = Task(
            id = "1",
            title = "Test Task",
            description = "Description",
            isCompleted = false
        )
        var callbackCalled = false
        
        // When
        composeTestRule.setContent {
            TaskItem(
                task = task,
                onToggleComplete = { callbackCalled = true },
                onDelete = { }
            )
        }
        
        composeTestRule
            .onNodeWithContentDescription("Mark as complete")
            .performClick()
        
        // Then
        assertTrue(callbackCalled)
    }
    
    @Test
    fun taskItem_clickDelete_callsCallback() {
        // Given
        val task = Task(
            id = "1",
            title = "Test Task",
            description = "Description",
            isCompleted = false
        )
        var callbackCalled = false
        
        // When
        composeTestRule.setContent {
            TaskItem(
                task = task,
                onToggleComplete = { },
                onDelete = { callbackCalled = true }
            )
        }
        
        composeTestRule
            .onNodeWithContentDescription("Delete task")
            .performClick()
        
        // Then
        assertTrue(callbackCalled)
    }
}
```

## 🎭 Mock Testing con MockK

### Advanced Mocking Scenarios

```kotlin
class ComplexRepositoryTest {
    
    @Test
    fun `repository should handle concurrent operations`() = runTest {
        // Given
        val repository = mockk<TaskRepository>()
        val tasks = (1..100).map { i ->
            Task(i.toString(), "Task $i", "Description $i")
        }
        
        // Mock concurrent operations
        every { repository.getTasks() } returns flow {
            tasks.forEach { task ->
                emit(Result.Success(listOf(task)))
                delay(10) // Simulate network delay
            }
        }
        
        // When
        val results = mutableListOf<Result<List<Task>>>()
        repository.getTasks().take(10).toList(results)
        
        // Then
        assertEquals(10, results.size)
        results.forEach { result ->
            assertTrue(result is Result.Success)
            assertEquals(1, (result as Result.Success).data.size)
        }
    }
    
    @Test
    fun `repository should handle network timeouts`() = runTest {
        // Given
        val repository = mockk<TaskRepository>()
        val timeoutException = SocketTimeoutException("Network timeout")
        
        every { repository.getTasks() } returns flow {
            delay(100) // Simulate network delay
            throw timeoutException
        }
        
        // When
        val result = repository.getTasks().first()
        
        // Then
        assertTrue(result is Result.Error)
        assertEquals("Network timeout", (result as Result.Error).message)
    }
    
    @Test
    fun `repository should cache results`() = runTest {
        // Given
        val repository = mockk<TaskRepository>()
        val tasks = listOf(Task("1", "Task 1", "Description"))
        var callCount = 0
        
        every { repository.getTasks() } returns flow {
            callCount++
            emit(Result.Success(tasks))
        }
        
        // When
        repository.getTasks().take(3).toList()
        
        // Then
        assertEquals(1, callCount) // Should only call once due to caching
    }
}
```

## 📊 Test Coverage y Reports

### Configuración de JaCoCo para Coverage

```kotlin
// build.gradle (app)
android {
    buildTypes {
        debug {
            testCoverageEnabled = true
        }
    }
}

dependencies {
    testImplementation "junit:junit:4.13.2"
    testImplementation "org.mockito:mockito-core:4.11.0"
    testImplementation "org.mockito.kotlin:mockito-kotlin:4.1.0"
    testImplementation "org.jetbrains.kotlinx:kotlinx-coroutines-test:1.7.3"
    testImplementation "io.insert-koin:koin-test:3.5.3"
    
    androidTestImplementation "androidx.test.ext:junit:1.1.5"
    androidTestImplementation "androidx.test.espresso:espresso-core:3.5.1"
    androidTestImplementation "androidx.compose.ui:ui-test-junit4:1.5.4"
    androidTestImplementation "io.insert-koin:koin-test:3.5.3"
}
```

### Test Utilities

```kotlin
object TestUtils {
    
    fun <T> Flow<Result<T>>.test(): List<Result<T>> {
        val results = mutableListOf<Result<T>>()
        runBlocking {
            toList(results)
        }
        return results
    }
    
    fun <T> assertResultSuccess(
        result: Result<T>,
        expectedValue: T? = null
    ) {
        assertTrue(result is Result.Success, "Expected Success but got $result")
        if (expectedValue != null) {
            assertEquals(expectedValue, (result as Result.Success).data)
        }
    }
    
    fun <T> assertResultError(
        result: Result<T>,
        expectedMessage: String? = null
    ) {
        assertTrue(result is Result.Error, "Expected Error but got $result")
        if (expectedMessage != null) {
            assertEquals(expectedMessage, (result as Result.Error).message)
        }
    }
    
    fun createMockTask(
        id: String = "1",
        title: String = "Test Task",
        description: String = "Test Description",
        isCompleted: Boolean = false
    ) = Task(id, title, description, isCompleted, System.currentTimeMillis())
}
```

## 🚀 Conclusión

Una estrategia de testing completa incluye:

- ✅ **Unit Tests**: 80% del testing pyramid, rápidos y fiables
- ✅ **Integration Tests**: 15%, testing de integración entre componentes
- ✅ **UI Tests**: 5%, testing de flujo de usuario completo
- ✅ **Mocking**: MockK para dependencias y escenarios complejos
- ✅ **Coverage**: JaCoCo para métricas de cobertura
- ✅ **CI/CD**: Integración con pipelines de testing automatizado

Este enfoque garantiza aplicaciones Android robustas, mantenibles y libres de bugs críticos.
