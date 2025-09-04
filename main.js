       // ================== CONFIGURAÇÃO DO FIREBASE ==================
        const firebaseConfig = {
            apiKey: "AIzaSyDd1lBoSFXMCYnV6PiP_v51StGUZgD-eMw",
            authDomain: "ferias-enfermagem.firebaseapp.com",
            projectId: "ferias-enfermagem",
            storageBucket: "ferias-enfermagem.firebasestorage.app",
            messagingSenderId: "265712802426",
            appId: "1:265712802426:web:4b1f39a4568d7a911e39c3"
        };

        // Inicializar Firebase
        firebase.initializeApp(firebaseConfig);
        const db = firebase.firestore();

        // ================== VARIÁVEIS GLOBAIS ==================
        let employees = [];
        let vacations = [];
        let selectedWard = null;
        let selectedShift = null;
        let pendingAction = null;

        // ================== FUNÇÕES DO FIREBASE ==================
        async function saveEmployee(employee) {
            try {
                // Verificar se nome já existe
                const nomeExistente = employees.find(emp => 
                    emp.name.toLowerCase() === employee.name.toLowerCase() && emp.id !== employee.id
                );
                
                if (nomeExistente) {
                    throw new Error("Já existe um funcionário com este nome!");
                }

                if (employee.id && employee.id.startsWith('firebase_')) {
                    // Atualizar funcionário existente
                    const firebaseId = employee.id.replace('firebase_', '');
                    await db.collection('employees').doc(firebaseId).set(employee);
                    return employee.id;
                } else {
                    // Criar novo funcionário
                    const docRef = await db.collection('employees').add(employee);
                    return 'firebase_' + docRef.id;
                }
            } catch (error) {
                console.error("Erro ao salvar no Firebase:", error);
                throw error;
            }
        }

        async function loadEmployees() {
            try {
                const snapshot = await db.collection('employees').get();
                employees = [];
                snapshot.forEach(doc => {
                    employees.push({ id: 'firebase_' + doc.id, ...doc.data() });
                });
                
                // Ordenar funcionários por nome
                employees.sort((a, b) => a.name.localeCompare(b.name));
                
                return employees;
            } catch (error) {
                console.error("Erro ao carregar funcionários:", error);
                return [];
            }
        }

        async function saveVacation(vacation) {
            try {
                if (vacation.id && vacation.id.startsWith('firebase_')) {
                    const firebaseId = vacation.id.replace('firebase_', '');
                    await db.collection('vacations').doc(firebaseId).set(vacation);
                    return vacation.id;
                } else {
                    const docRef = await db.collection('vacations').add(vacation);
                    return 'firebase_' + docRef.id;
                }
            } catch (error) {
                console.error("Erro ao salvar férias:", error);
                throw error;
            }
        }

        async function loadVacations() {
            try {
                const snapshot = await db.collection('vacations').get();
                vacations = [];
                snapshot.forEach(doc => {
                    vacations.push({ id: 'firebase_' + doc.id, ...doc.data() });
                });
                return vacations;
            } catch (error) {
                console.error("Erro ao carregar férias:", error);
                return [];
            }
        }

        async function deleteEmployee(employeeId) {
            try {
                if (employeeId.startsWith('firebase_')) {
                    const firebaseId = employeeId.replace('firebase_', '');
                    await db.collection('employees').doc(firebaseId).delete();
                    
                    // Também exclui as férias associadas
                    const vacationQuery = await db.collection('vacations')
                        .where('employeeId', '==', employeeId)
                        .get();
                    
                    const deletePromises = [];
                    vacationQuery.forEach(doc => {
                        deletePromises.push(doc.ref.delete());
                    });
                    
                    await Promise.all(deletePromises);
                }
            } catch (error) {
                console.error("Erro ao excluir funcionário:", error);
                throw error;
            }
        }

        async function deleteVacation(vacationId) {
            try {
                if (vacationId.startsWith('firebase_')) {
                    const firebaseId = vacationId.replace('firebase_', '');
                    await db.collection('vacations').doc(firebaseId).delete();
                }
            } catch (error) {
                console.error("Erro ao excluir férias:", error);
                throw error;
            }
        }

        // ================== FUNÇÕES DE UI/UX ==================
        function toggleSection(sectionId) {
            const section = document.getElementById(sectionId);
            const icon = section.previousElementSibling.querySelector('i');
            
            section.classList.toggle('hidden');
            icon.classList.toggle('fa-chevron-down');
            icon.classList.toggle('fa-chevron-up');
        }

        function toggleAlert() {
            const alertDetails = document.getElementById('alertDetails');
            const icon = document.querySelector('#alertSection .fa-chevron-down, #alertSection .fa-chevron-up');
            
            alertDetails.classList.toggle('hidden');
            if (icon) {
                icon.classList.toggle('fa-chevron-down');
                icon.classList.toggle('fa-chevron-up');
            }
        }

        function showModal(modalId) {
            document.getElementById(modalId).style.display = 'flex';
        }

        function hideModal(modalId) {
            document.getElementById(modalId).style.display = 'none';
        }

        function showConfirmation(message, callback) {
            document.getElementById('confirmationMessage').textContent = message;
            pendingAction = callback;
            showModal('confirmationModal');
        }

        function closeSearchResults() {
            document.getElementById('searchResultsContainer').classList.add('hidden');
        }

        // ================== FUNÇÕES PRINCIPAIS ==================
        function initializeApp() {
            setupEventListeners();
            loadAllData();
            renderWardsNavbar();
            renderShiftFilter();
        }

        async function loadAllData() {
            employees = await loadEmployees();
            vacations = await loadVacations();
            renderEmployeesBoard();
            renderVacationLists();
            checkRequirements();
            checkVacationConflicts();
        }

        function setupEventListeners() {
            // Formulário de funcionário
            document.getElementById('employeeForm').addEventListener('submit', async function(e) {
                e.preventDefault();
                await addEmployee();
            });

            // Busca
            document.getElementById('searchButton').addEventListener('click', searchEmployee);
            document.getElementById('searchInput').addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    searchEmployee();
                }
            });

            // Fechar resultados de busca ao clicar fora
            document.addEventListener('click', function(e) {
                const resultsContainer = document.getElementById('searchResultsContainer');
                const searchContainer = document.querySelector('.search-container');
                
                if (!searchContainer.contains(e.target) && !resultsContainer.classList.contains('hidden')) {
                    resultsContainer.classList.add('hidden');
                }
            });

            // Cálculo automático de férias
            document.getElementById('vacationStart').addEventListener('change', calculateVacationEnd);
            document.getElementById('vacationDays').addEventListener('input', calculateVacationEnd);

            // Formulário de férias
            document.getElementById('vacationForm').addEventListener('submit', async function(e) {
                e.preventDefault();
                await saveVacationData();
            });

            // Formulário de mover
            document.getElementById('moveForm').addEventListener('submit', async function(e) {
                e.preventDefault();
                await moveEmployeeData();
            });

            // Confirmações
            document.getElementById('confirmYes').addEventListener('click', function() {
                if (pendingAction) {
                    pendingAction();
                    pendingAction = null;
                }
                hideModal('confirmationModal');
            });

            document.getElementById('confirmNo').addEventListener('click', function() {
                pendingAction = null;
                hideModal('confirmationModal');
            });

            // Fechar modais
            document.querySelectorAll('.close').forEach(closeBtn => {
                closeBtn.addEventListener('click', function() {
                    this.closest('.modal').style.display = 'none';
                });
            });

            // Fechar modais clicando fora
            window.addEventListener('click', function(event) {
                if (event.target.classList.contains('modal')) {
                    event.target.style.display = 'none';
                }
            });
        }

        async function addEmployee() {
            const name = document.getElementById('name').value;
            const role = document.getElementById('role').value;
            const ward = document.getElementById('ward').value;
            const shift = document.getElementById('shift').value;

            // Mostrar loading no botão
            const submitButton = document.getElementById('submitButton');
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cadastrando...';
            submitButton.disabled = true;

            try {
                const newEmployee = { name, role, ward, shift };
                const employeeId = await saveEmployee(newEmployee);
                
                // Atualizar a lista
                employees.push({ id: employeeId, ...newEmployee });
                
                // Ordenar funcionários por nome
                employees.sort((a, b) => a.name.localeCompare(b.name));
                
                // Limpar apenas o campo do nome, manter os demais
                document.getElementById('name').value = '';
                
                renderEmployeesBoard();
                renderShiftFilter();
                checkRequirements();
                checkVacationConflicts();
                
            } catch (error) {
                alert(error.message);
            } finally {
                // Restaurar botão
                submitButton.innerHTML = 'Adicionar Funcionário';
                submitButton.disabled = false;
            }
        }

        function searchEmployee() {
            const searchTerm = document.getElementById('searchInput').value.toLowerCase();
            const resultsContainer = document.getElementById('searchResultsContainer');
            
            if (!searchTerm) {
                resultsContainer.classList.add('hidden');
                return;
            }

            const results = employees.filter(emp => 
                emp.name.toLowerCase().includes(searchTerm)
            );

            if (results.length === 0) {
                resultsContainer.innerHTML = '<div class="search-result-item">Nenhum funcionário encontrado</div>';
            } else {
                resultsContainer.innerHTML = results.map(emp => `
                    <div class="search-result-item" data-id="${emp.id}">
                        <div>
                            <div><strong>${emp.name}</strong></div>
                            <small>${emp.role} - ${emp.ward} (${emp.shift})</small>
                        </div>
                        <button class="close-search" onclick="closeSearchResults()">&times;</button>
                    </div>
                `).join('');

                // Adicionar event listeners para os resultados
                resultsContainer.querySelectorAll('.search-result-item').forEach(item => {
                    item.addEventListener('click', function() {
                        const employeeId = this.getAttribute('data-id');
                        const employee = employees.find(emp => emp.id === employeeId);
                        if (employee) {
                            // Selecionar a enfermaria e turno do funcionário
                            selectWard(employee.ward);
                            selectShift(employee.shift);
                            
                            // Fechar resultados
                            resultsContainer.classList.add('hidden');
                            document.getElementById('searchInput').value = '';
                            
                            // Scroll para a seção de funcionários
                            document.querySelector('.board-section').scrollIntoView({
                                behavior: 'smooth'
                            });
                        }
                    });
                });
            }

            resultsContainer.classList.remove('hidden');
        }

        // ================== FUNÇÕES DOS BOTÕES ==================
        function openVacationModal(employeeId) {
            const employee = employees.find(emp => emp.id === employeeId);
            if (!employee) return;

            document.getElementById('vacationEmployeeId').value = employeeId;
            document.getElementById('vacationStart').value = '';
            document.getElementById('vacationDays').value = '30';
            document.getElementById('vacationEnd').value = '';

            // Preencher data de início sugerida
            const suggestedStart = new Date();
            suggestedStart.setDate(suggestedStart.getDate() + 15);
            document.getElementById('vacationStart').value = suggestedStart.toISOString().split('T')[0];

            // Calcular término automaticamente
            calculateVacationEnd();

            showModal('vacationModal');
        }

        function openMoveModal(employeeId) {
            const employee = employees.find(emp => emp.id === employeeId);
            if (!employee) return;

            document.getElementById('moveEmployeeId').value = employeeId;
            document.getElementById('moveWard').value = employee.ward;
            document.getElementById('moveShift').value = employee.shift;

            showModal('moveModal');
        }

        function confirmDeleteEmployee(employeeId) {
            const employee = employees.find(emp => emp.id === employeeId);
            if (!employee) return;

            showConfirmation(
                `Tem certeza que deseja excluir ${employee.name}?`,
                async () => {
                    try {
                        await deleteEmployee(employeeId);
                        employees = employees.filter(emp => emp.id !== employeeId);
                        vacations = vacations.filter(v => v.employeeId !== employeeId);
                        renderEmployeesBoard();
                        renderVacationLists();
                        renderShiftFilter();
                        checkRequirements();
                        checkVacationConflicts();
                    } catch (error) {
                        alert("Erro ao excluir funcionário: " + error.message);
                    }
                }
            );
        }

        function confirmRemoveVacation(vacationId) {
            const vacation = vacations.find(v => v.id === vacationId);
            if (!vacation) return;
            
            const employee = employees.find(emp => emp.id === vacation.employeeId);
            if (!employee) return;

            showConfirmation(
                `Tem certeza que deseja remover as férias de ${employee.name}?`,
                async () => {
                    try {
                        await deleteVacation(vacationId);
                        vacations = vacations.filter(v => v.id !== vacationId);
                        renderEmployeesBoard();
                        renderVacationLists();
                        checkVacationConflicts();
                    } catch (error) {
                        alert("Erro ao remover férias: " + error.message);
                    }
                }
            );
        }

        async function saveVacationData() {
            const employeeId = document.getElementById('vacationEmployeeId').value;
            const startDate = document.getElementById('vacationStart').value;
            const days = parseInt(document.getElementById('vacationDays').value);
            const endDate = document.getElementById('vacationEnd').value;

            try {
                const vacation = {
                    employeeId,
                    start: startDate,
                    end: endDate,
                    days
                };

                const vacationId = await saveVacation(vacation);
                vacations.push({ id: vacationId, ...vacation });
                
                hideModal('vacationModal');
                renderEmployeesBoard();
                renderVacationLists();
                checkVacationConflicts();
            } catch (error) {
                alert("Erro ao salvar férias: " + error.message);
            }
        }

        async function moveEmployeeData() {
            const employeeId = document.getElementById('moveEmployeeId').value;
            const newWard = document.getElementById('moveWard').value;
            const newShift = document.getElementById('moveShift').value;

            try {
                const employee = employees.find(emp => emp.id === employeeId);
                if (!employee) return;

                employee.ward = newWard;
                employee.shift = newShift;

                await saveEmployee(employee);
                
                hideModal('moveModal');
                renderEmployeesBoard();
                renderShiftFilter();
                checkRequirements();
                checkVacationConflicts();
            } catch (error) {
                alert("Erro ao mover funcionário: " + error.message);
            }
        }

        // ================== OUTRAS FUNÇÕES ==================
        function calculateVacationEnd() {
            const startDate = new Date(document.getElementById('vacationStart').value);
            const days = parseInt(document.getElementById('vacationDays').value);
            
            if (isNaN(startDate.getTime()) || isNaN(days)) {
                document.getElementById('vacationEnd').value = '';
                return;
            }
            
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + days);
            
            document.getElementById('vacationEnd').value = endDate.toISOString().split('T')[0];
        }

        function getVacationStatus(employeeId) {
            const now = new Date();
            const employeeVacation = vacations.find(v => v.employeeId === employeeId);
            
            if (!employeeVacation) return null;
            
            const startDate = new Date(employeeVacation.start);
            const endDate = new Date(employeeVacation.end);
            
            // Verifica se está em férias atualmente
            if (now >= startDate && now <= endDate) {
                return 'current';
            }
            
            // Verifica se são férias futuras (próximo mês)
            const nextMonth = new Date();
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            nextMonth.setDate(1);
            
            if (startDate >= nextMonth && startDate <= new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0)) {
                return 'upcoming';
            }
            
            return null;
        }

        function renderVacationLists() {
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();
            
            // Férias do mês atual (que estão acontecendo ou começam este mês)
            const currentVacations = vacations.filter(v => {
                const startDate = new Date(v.start);
                const endDate = new Date(v.end);
                return (startDate.getMonth() === currentMonth && startDate.getFullYear() === currentYear) ||
                       (now >= startDate && now <= endDate);
            });
            
            // Próximas férias (que começam no próximo mês)
            const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
            const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
            
            const nextVacations = vacations.filter(v => {
                const startDate = new Date(v.start);
                return startDate.getMonth() === nextMonth && startDate.getFullYear() === nextYear;
            });
            
            // Renderizar férias atuais
            const currentList = document.getElementById('currentVacations');
            if (currentVacations.length === 0) {
                currentList.innerHTML = '<div class="empty-state">Nenhuma férias este mês</div>';
            } else {
                currentList.innerHTML = currentVacations.map(v => {
                    const employee = employees.find(emp => emp.id === v.employeeId);
                    if (!employee) return '';
                    
                    const startDate = new Date(v.start).toLocaleDateString('pt-BR');
                    const endDate = new Date(v.end).toLocaleDateString('pt-BR');
                    
                    return `
                        <div class="vacation-item">
                            <div>
                                <div>${employee.name} (${employee.role})</div>
                                <div>${employee.ward} - ${employee.shift}</div>
                                <div>${startDate} - ${endDate}</div>
                            </div>
                            <button class="remove-vacation-btn" onclick="confirmRemoveVacation('${v.id}')">
                                Remover
                            </button>
                        </div>
                    `;
                }).join('');
            }
            
            // Renderizar próximas férias
            const nextList = document.getElementById('nextVacations');
            if (nextVacations.length === 0) {
                nextList.innerHTML = '<div class="empty-state">Nenhuma férias no próximo mês</div>';
            } else {
                nextList.innerHTML = nextVacations.map(v => {
                    const employee = employees.find(emp => emp.id === v.employeeId);
                    if (!employee) return '';
                    
                    const startDate = new Date(v.start).toLocaleDateString('pt-BR');
                    const endDate = new Date(v.end).toLocaleDateString('pt-BR');
                    
                    return `
                        <div class="vacation-item">
                            <div>
                                <div>${employee.name} (${employee.role})</div>
                                <div>${employee.ward} - ${employee.shift}</div>
                                <div>${startDate} - ${endDate}</div>
                            </div>
                            <button class="remove-vacation-btn" onclick="confirmRemoveVacation('${v.id}')">
                                Remover
                            </button>
                        </div>
                    `;
                }).join('');
            }
        }

        // ================== FUNÇÕES DE RENDERIZAÇÃO ==================
        function renderWardsNavbar() {
            const wards = ['A.T', 'Ambulatório', 'CCP', 'CEMES', 'CSO', 'Curativo', 'LI', 'LII', 'M.A', 'SCIH', 'UCI'];
            const navbar = document.getElementById('wardsNavbar');
            
            navbar.innerHTML = wards.map(ward => `
                <div class="ward-tab" data-ward="${ward}">${ward}</div>
            `).join('');
            
            // Adicionar event listeners
            navbar.querySelectorAll('.ward-tab').forEach(tab => {
                tab.addEventListener('click', function() {
                    selectWard(this.getAttribute('data-ward'));
                });
            });
        }

        function renderShiftFilter() {
            const shifts = ['Manhã', 'Tarde', 'Noite'];
            const filter = document.getElementById('shiftFilter');
            
            // Contar funcionários por turno (apenas os que não estão de férias)
            const shiftCounts = {
                'Manhã': employees.filter(emp => emp.shift === 'Manhã' && !getVacationStatus(emp.id)).length,
                'Tarde': employees.filter(emp => emp.shift === 'Tarde' && !getVacationStatus(emp.id)).length,
                'Noite': employees.filter(emp => emp.shift === 'Noite' && !getVacationStatus(emp.id)).length
            };
            
            filter.innerHTML = shifts.map(shift => `
                <div class="shift-tab" data-shift="${shift}">${shift} (${shiftCounts[shift]})</div>
            `).join('');
            
            // Adicionar event listeners
            filter.querySelectorAll('.shift-tab').forEach(tab => {
                tab.addEventListener('click', function() {
                    selectShift(this.getAttribute('data-shift'));
                });
            });
        }

        function selectWard(ward) {
            selectedWard = ward;
            document.querySelectorAll('.ward-tab').forEach(tab => {
                tab.classList.toggle('active', tab.getAttribute('data-ward') === ward);
            });
            renderEmployeesBoard();
        }

        function selectShift(shift) {
            selectedShift = shift;
            document.querySelectorAll('.shift-tab').forEach(tab => {
                tab.classList.toggle('active', tab.getAttribute('data-shift') === shift);
            });
            renderEmployeesBoard();
        }

        function renderEmployeesBoard() {
            const board = document.getElementById('employeesBoard');
            board.innerHTML = '';
            
            // Filtrar funcionários que não estão de férias
            const activeEmployees = employees.filter(emp => !getVacationStatus(emp.id));
            
            if (selectedShift && !selectedWard) {
                // Visualização por turno (3 colunas)
                board.classList.add('shift-view');
                
                const shiftEmployees = activeEmployees.filter(emp => emp.shift === selectedShift);
                const wards = [...new Set(shiftEmployees.map(emp => emp.ward))].sort();
                
                // Dividir enfermarias em 3 colunas
                const columnCount = 3;
                const itemsPerColumn = Math.ceil(wards.length / columnCount);
                
                for (let i = 0; i < columnCount; i++) {
                    const columnWards = wards.slice(i * itemsPerColumn, (i + 1) * itemsPerColumn);
                    
                    const columnElement = document.createElement('div');
                    columnElement.className = 'employee-column';
                    
                    columnWards.forEach(ward => {
                        const wardEmployees = shiftEmployees.filter(emp => emp.ward === ward);
                        
                        const groupElement = document.createElement('div');
                        groupElement.className = 'employee-group';
                        
                        const title = document.createElement('h3');
                        title.textContent = `${ward} (${wardEmployees.length})`;
                        
                        const listElement = document.createElement('div');
                        listElement.className = 'employee-list';
                        
                        listElement.innerHTML = wardEmployees.map(employee => {
                            return `
                                <div class="employee-item" data-id="${employee.id}">
                                    <div>
                                        <div class="employee-name">${employee.name}</div>
                                        <div class="employee-role">${employee.role}</div>
                                    </div>
                                    <div class="employee-actions">
                                        <button class="move-btn" title="Mover" onclick="openMoveModal('${employee.id}')">
                                            <i class="fas fa-exchange"></i>
                                        </button>
                                        <button class="edit-btn" title="Editar férias" onclick="openVacationModal('${employee.id}')">
                                            <i class="fas fa-umbrella-beach"></i>
                                        </button>
                                        <button class="delete-btn" title="Excluir" onclick="confirmDeleteEmployee('${employee.id}')">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </div>
                            `;
                        }).join('');
                        
                        groupElement.appendChild(title);
                        groupElement.appendChild(listElement);
                        columnElement.appendChild(groupElement);
                    });
                    
                    board.appendChild(columnElement);
                }
            } else {
                // Visualização normal
                board.classList.remove('shift-view');
                
                // Agrupar funcionários por enfermaria e turno
                const groupedEmployees = {};
                
                activeEmployees.forEach(employee => {
                    if (selectedWard && employee.ward !== selectedWard) return;
                    if (selectedShift && employee.shift !== selectedShift) return;
                    
                    const key = `${employee.ward}-${employee.shift}`;
                    if (!groupedEmployees[key]) {
                        groupedEmployees[key] = [];
                    }
                    groupedEmployees[key].push(employee);
                });
                
                // Ordenar grupos por enfermaria
                const sortedGroups = Object.entries(groupedEmployees).sort((a, b) => {
                    return a[0].localeCompare(b[0]);
                });
                
                // Renderizar cada grupo
                for (const [key, groupEmployees] of sortedGroups) {
                    const [ward, shift] = key.split('-');
                    const groupElement = document.createElement('div');
                    groupElement.className = 'employee-group';
                    
                    const title = document.createElement('h3');
                    title.textContent = `${ward} - ${shift} (${groupEmployees.length})`;
                    
                    const listElement = document.createElement('div');
                    listElement.className = 'employee-list';
                    
                    listElement.innerHTML = groupEmployees.map(employee => {
                        return `
                            <div class="employee-item" data-id="${employee.id}">
                                <div>
                                    <div class="employee-name">${employee.name}</div>
                                    <div class="employee-role">${employee.role}</div>
                                </div>
                                <div class="employee-actions">
                                    <button class="move-btn" title="Mover" onclick="openMoveModal('${employee.id}')">
                                        <i class="fas fa-exchange"></i>
                                    </button>
                                    <button class="edit-btn" title="Editar férias" onclick="openVacationModal('${employee.id}')">
                                        <i class="fas fa-umbrella-beach"></i>
                                    </button>
                                    <button class="delete-btn" title="Excluir" onclick="confirmDeleteEmployee('${employee.id}')">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        `;
                    }).join('');
                    
                    groupElement.appendChild(title);
                    groupElement.appendChild(listElement);
                    board.appendChild(groupElement);
                }
            }
        }

        function checkRequirements() {
            // Requisitos de enfermeiros
            const nurseRequirements = {
                'LII': 2, 'CCP': 2, 'CSO': 2,
                'M.A': 1, 'LI': 1, 'UCI': 1, 'A.T': 1, 
                'Ambulatório': 1, 'Curativo': 1, 'SCIH': 1,
                'CEMES': 1 // Valor padrão para CEMES
            };
            
            // Requisitos de técnicos
            const techRequirements = {
                'M.A': { 'Manhã': 6, 'Tarde': 6, 'Noite': 8 },
                'LII': { 'Manhã': 10, 'Tarde': 10, 'Noite': 12 },
                'LI': { 'Manhã': 5, 'Tarde': 5, 'Noite': 6 },
                'CCP': { 'Manhã': 10, 'Tarde': 10, 'Noite': 14 },
                'CSO': { 'Manhã': 7, 'Tarde': 7, 'Noite': 10 },
                'UCI': { 'Manhã': 5, 'Tarde': 5, 'Noite': 7 },
                'A.T': { 'Manhã': 1, 'Noite': 2 },
                'Ambulatório': { 'Manhã': 9, 'Tarde': 4 },
                'Curativo': { 'Manhã': 2 },
                'SCIH': { 'Manhã': 1 },
                'CEMES': { 'Manhã': 1, 'Tarde': 1, 'Noite': 1 } // Valores padrão para CEMES
            };
            
            let alerts = [];
            let alertDetails = [];
            
            // Verificar enfermeiros (apenas os que não estão de férias)
            for (const [ward, minNurses] of Object.entries(nurseRequirements)) {
                const nurses = employees.filter(emp => 
                    emp.ward === ward && 
                    emp.role === 'Enfermeiro' && 
                    !getVacationStatus(emp.id)
                );
                if (nurses.length < minNurses) {
                    alertDetails.push(`${ward}: ${nurses.length}/${minNurses} enfermeiros`);
                }
            }
            
            // Verificar técnicos por turno (apenas os que não estão de férias)
            for (const [ward, shifts] of Object.entries(techRequirements)) {
                for (const [shift, minTechs] of Object.entries(shifts)) {
                    const techs = employees.filter(emp => 
                        emp.ward === ward && 
                        emp.shift === shift && 
                        emp.role === 'Técnico em Enfermagem' &&
                        !getVacationStatus(emp.id)
                    );
                    if (techs.length < minTechs) {
                        alertDetails.push(`${ward} - ${shift}: ${techs.length}/${minTechs} técnicos`);
                    }
                }
            }
            
            // Mostrar alertas se necessário
            const alertSection = document.getElementById('alertSection');
            const alertMessage = document.getElementById('alertMessage');
            const alertDetailsElement = document.getElementById('alertDetails');
            
            if (alertDetails.length > 0) {
                alertMessage.textContent = `Requisitos mínimos não atendidos (${alertDetails.length})`;
                alertDetailsElement.innerHTML = alertDetails.join('<br>');
                alertSection.classList.remove('hidden');
            } else {
                alertSection.classList.add('hidden');
            }
        }

        function checkVacationConflicts() {
            // Requisitos de enfermeiros
            const nurseRequirements = {
                'LII': 2, 'CCP': 2, 'CSO': 2,
                'M.A': 1, 'LI': 1, 'UCI': 1, 'A.T': 1, 
                'Ambulatório': 1, 'Curativo': 1, 'SCIH': 1,
                'CEMES': 1
            };
            
            // Requisitos de técnicos
            const techRequirements = {
                'M.A': { 'Manhã': 6, 'Tarde': 6, 'Noite': 8 },
                'LII': { 'Manhã': 10, 'Tarde': 10, 'Noite': 12 },
                'LI': { 'Manhã': 5, 'Tarde': 5, 'Noite': 6 },
                'CCP': { 'Manhã': 10, 'Tarde': 10, 'Noite': 14 },
                'CSO': { 'Manhã': 7, 'Tarde': 7, 'Noite': 10 },
                'UCI': { 'Manhã': 5, 'Tarde': 5, 'Noite': 7 },
                'A.T': { 'Manhã': 1, 'Noite': 2 },
                'Ambulatório': { 'Manhã': 9, 'Tarde': 4 },
                'Curativo': { 'Manhã': 2 },
                'SCIH': { 'Manhã': 1 },
                'CEMES': { 'Manhã': 1, 'Tarde': 1, 'Noite': 1 }
            };
            
            let vacationConflicts = [];
            
            // Verificar conflitos para enfermeiros
            for (const [ward, minNurses] of Object.entries(nurseRequirements)) {
                const nursesOnVacation = employees.filter(emp => 
                    emp.ward === ward && 
                    emp.role === 'Enfermeiro' && 
                    getVacationStatus(emp.id) === 'current'
                ).length;
                
                const activeNurses = employees.filter(emp => 
                    emp.ward === ward && 
                    emp.role === 'Enfermeiro' && 
                    !getVacationStatus(emp.id)
                ).length;
                
                if (activeNurses < minNurses && nursesOnVacation > 0) {
                    vacationConflicts.push(`${ward}: ${nursesOnVacation} enfermeiro(s) de férias com apenas ${activeNurses} ativo(s) (mínimo: ${minNurses})`);
                }
            }
            
            // Verificar conflitos para técnicos
            for (const [ward, shifts] of Object.entries(techRequirements)) {
                for (const [shift, minTechs] of Object.entries(shifts)) {
                    const techsOnVacation = employees.filter(emp => 
                        emp.ward === ward && 
                        emp.shift === shift && 
                        emp.role === 'Técnico em Enfermagem' &&
                        getVacationStatus(emp.id) === 'current'
                    ).length;
                    
                    const activeTechs = employees.filter(emp => 
                        emp.ward === ward && 
                        emp.shift === shift && 
                        emp.role === 'Técnico em Enfermagem' &&
                        !getVacationStatus(emp.id)
                    ).length;
                    
                    if (activeTechs < minTechs && techsOnVacation > 0) {
                        vacationConflicts.push(`${ward} - ${shift}: ${techsOnVacation} técnico(s) de férias com apenas ${activeTechs} ativo(s) (mínimo: ${minTechs})`);
                    }
                }
            }
            
            // Mostrar alerta de conflito se necessário
            if (vacationConflicts.length > 0) {
                alert(`CONFLITO DE FÉRIAS:\n\n${vacationConflicts.join('\n')}`);
            }
        }

        // ================== INICIALIZAÇÃO ==================
        document.addEventListener('DOMContentLoaded', function() {
            initializeApp();
        });