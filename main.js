document.addEventListener('DOMContentLoaded', function () {
    // Referências aos elementos do DOM
    const employeeForm = document.getElementById('employeeForm');
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const searchResults = document.getElementById('searchResults');
    const alertSection = document.getElementById('alertSection');
    const alertMessage = document.getElementById('alertMessage');
    const wardsNavbar = document.getElementById('wardsNavbar');
    const shiftFilter = document.getElementById('shiftFilter');
    const employeesBoard = document.getElementById('employeesBoard');
    const currentVacations = document.getElementById('currentVacations');
    const nextVacations = document.getElementById('nextVacations');
    const vacationModal = document.getElementById('vacationModal');
    const vacationForm = document.getElementById('vacationForm');
    const vacationEnd = document.getElementById('vacationEnd');
    const closeModal = document.querySelectorAll('.close');
    const confirmationModal = document.getElementById('confirmationModal');
    const confirmationMessage = document.getElementById('confirmationMessage');
    const confirmYes = document.getElementById('confirmYes');
    const confirmNo = document.getElementById('confirmNo');
    const moveModal = document.getElementById('moveModal');
    const moveForm = document.getElementById('moveForm');
    const moveWardSelect = document.getElementById('moveWard');
    const moveShiftSelect = document.getElementById('moveShift');

    // Lista de enfermarias com requisitos mínimos
    const wards = [
        { id: 'ma', name: 'M.A', requirements: { Manhã: 6, Tarde: 6, Noite: 8 }, nurses: 1 },
        { id: 'lii', name: 'LII', requirements: { Manhã: 10, Tarde: 10, Noite: 12 }, nurses: 2 },
        { id: 'li', name: 'LI', requirements: { Manhã: 5, Tarde: 5, Noite: 6 }, nurses: 1 },
        { id: 'ccp', name: 'CCP', requirements: { Manhã: 10, Tarde: 10, Noite: 14 }, nurses: 2 },
        { id: 'cso', name: 'CSO', requirements: { Manhã: 7, Tarde: 7, Noite: 10 }, nurses: 2 },
        { id: 'uci', name: 'UCI', requirements: { Manhã: 5, Tarde: 5, Noite: 7 }, nurses: 1 },
        { id: 'at', name: 'A.T', requirements: { Manhã: 1, Tarde: 1, Noite: 2 }, nurses: 1 },
        { id: 'ambulatorio', name: 'Ambulatório', requirements: { Manhã: 9, Tarde: 4, Diurno: 6 }, nurses: 1 },
        { id: 'curativo', name: 'Curativo', requirements: { Manhã: 2, Diurno: 1 }, nurses: 1 },
        { id: 'scih', name: 'SCIH', requirements: { Manhã: { tecnico: 1, enfermeiro: 1 } }, nurses: 1 }
    ];

    // Requisitos totais de enfermeiros por turno
    const nursesRequirements = {
        Manhã: 16,
        Tarde: 16,
        Noite: 13
    };

    // Array para armazenar os funcionários
    let employees = JSON.parse(localStorage.getItem(DB_KEYS.EMPLOYEES)) || [];
    let vacations = JSON.parse(localStorage.getItem(DB_KEYS.VACATIONS)) || [];

    // Variáveis para controle de seleção
    let selectedWard = null;
    let selectedShift = null;
    let draggedEmployee = null;
    let pendingAction = null;

    // Inicializar a aplicação
    function init() {
        renderWardsNavbar();
        renderShiftFilter();
        renderEmployeesBoard();
        renderVacationLists();
        setupEventListeners();
        checkRequirements();
    }

    // Configurar event listeners
    function setupEventListeners() {
        // Event listeners para os modais
        closeModal.forEach(closeBtn => {
            closeBtn.addEventListener('click', function () {
                vacationModal.style.display = 'none';
                confirmationModal.style.display = 'none';
                moveModal.style.display = 'none';
            });
        });

        // Fechar modal clicando fora dele
        window.addEventListener('click', function (event) {
            if (event.target === vacationModal) {
                vacationModal.style.display = 'none';
            }
            if (event.target === confirmationModal) {
                confirmationModal.style.display = 'none';
                pendingAction = null;
            }
            if (event.target === moveModal) {
                moveModal.style.display = 'none';
            }
        });

        // Buscar funcionário
        searchButton.addEventListener('click', searchEmployee);
        searchInput.addEventListener('keyup', function (event) {
            if (event.key === 'Enter') {
                searchEmployee();
            }
        });

        // Calcular data de término das férias
        document.getElementById('vacationStart').addEventListener('change', calculateVacationEnd);
        document.getElementById('vacationDays').addEventListener('input', calculateVacationEnd);

        // Formulários
        employeeForm.addEventListener('submit', addEmployee);
        vacationForm.addEventListener('submit', saveVacation);
        moveForm.addEventListener('submit', confirmMoveEmployee);

        // Confirmação de ações
        confirmYes.addEventListener('click', executePendingAction);
        confirmNo.addEventListener('click', function () {
            confirmationModal.style.display = 'none';
            pendingAction = null;
        });

        // Toggle dos quadros de férias
        document.querySelectorAll('.toggle-header').forEach(header => {
            header.addEventListener('click', function () {
                const list = this.nextElementSibling;
                const icon = this.querySelector('i');
                list.classList.toggle('hidden');
                icon.classList.toggle('fa-chevron-up');
                icon.classList.toggle('fa-chevron-down');
            });
        });
    }

    // Renderizar navbar de enfermarias
    function renderWardsNavbar() {
        wardsNavbar.innerHTML = '';

        // Adicionar opção "Todas"
        const allTab = document.createElement('div');
        allTab.className = 'ward-tab active';
        allTab.textContent = 'Todas as Enfermarias';
        allTab.setAttribute('data-ward', 'all');
        allTab.addEventListener('click', function () {
            selectWard('all');
        });
        wardsNavbar.appendChild(allTab);

        // Adicionar enfermarias
        wards.forEach(ward => {
            const tab = document.createElement('div');
            tab.className = 'ward-tab';
            tab.textContent = ward.name;
            tab.setAttribute('data-ward', ward.id);
            tab.addEventListener('click', function () {
                selectWard(ward.id);
            });
            wardsNavbar.appendChild(tab);
        });

        // Selecionar "Todas" por padrão
        selectedWard = 'all';

        // Preencher selects do formulário de cadastro e mover
        const wardSelect = document.getElementById('ward');
        const moveWardSelect = document.getElementById('moveWard');
        wardSelect.innerHTML = '';
        moveWardSelect.innerHTML = '';
        wards.forEach(ward => {
            const option = document.createElement('option');
            option.value = ward.name;
            option.textContent = ward.name;
            wardSelect.appendChild(option);

            const moveOption = document.createElement('option');
            moveOption.value = ward.name;
            moveOption.textContent = ward.name;
            moveWardSelect.appendChild(moveOption);
        });
    }

    // Renderizar filtro de turnos
    function renderShiftFilter() {
        shiftFilter.innerHTML = '';

        const shifts = ['Manhã', 'Tarde', 'Noite'];

        // Adicionar opção "Todos"
        const allTab = document.createElement('div');
        allTab.className = 'shift-tab active';
        allTab.textContent = 'Todos os Turnos';
        allTab.setAttribute('data-shift', 'all');
        allTab.addEventListener('click', function () {
            selectShift('all');
        });
        shiftFilter.appendChild(allTab);

        // Adicionar turnos
        shifts.forEach(shift => {
            const tab = document.createElement('div');
            tab.className = 'shift-tab';
            tab.textContent = shift;
            tab.setAttribute('data-shift', shift);
            tab.addEventListener('click', function () {
                selectShift(shift);
            });
            shiftFilter.appendChild(tab);
        });

        // Selecionar "Todos" por padrão
        selectedShift = 'all';

        // Preencher selects de turno
        const shiftSelect = document.getElementById('shift');
        const moveShiftSelect = document.getElementById('moveShift');
        shiftSelect.innerHTML = '';
        moveShiftSelect.innerHTML = '';
        shifts.forEach(shift => {
            const option = document.createElement('option');
            option.value = shift;
            option.textContent = shift;
            shiftSelect.appendChild(option);

            const moveOption = document.createElement('option');
            moveOption.value = shift;
            moveOption.textContent = shift;
            moveShiftSelect.appendChild(moveOption);
        });
    }

    // Selecionar enfermaria
    function selectWard(wardId) {
        selectedWard = wardId;

        // Atualizar UI
        document.querySelectorAll('.ward-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`.ward-tab[data-ward="${wardId}"]`).classList.add('active');

        renderEmployeesBoard();
    }

    // Selecionar turno
    function selectShift(shift) {
        selectedShift = shift;

        // Atualizar UI
        document.querySelectorAll('.shift-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`.shift-tab[data-shift="${shift}"]`).classList.add('active');

        renderEmployeesBoard();
    }

    // Renderizar quadro de funcionários
    function renderEmployeesBoard() {
        employeesBoard.innerHTML = '';

        // Filtrar funcionários com base nas seleções
        let filteredEmployees = employees;

        if (selectedWard !== 'all') {
            const wardName = wards.find(w => w.id === selectedWard)?.name;
            filteredEmployees = filteredEmployees.filter(emp => emp.ward === wardName);
        }

        if (selectedShift !== 'all') {
            filteredEmployees = filteredEmployees.filter(emp => emp.shift === selectedShift);
        }

        // Agrupar por enfermaria e turno
        const groupedEmployees = {};

        filteredEmployees.forEach(emp => {
            const key = `${emp.ward}-${emp.shift}`;
            if (!groupedEmployees[key]) {
                groupedEmployees[key] = [];
            }
            groupedEmployees[key].push(emp);
        });

        // Renderizar grupos
        for (const key in groupedEmployees) {
            const [wardName, shift] = key.split('-');
            const ward = wards.find(w => w.name === wardName);

            const groupElement = document.createElement('div');
            groupElement.className = 'employee-group';

            const title = document.createElement('h3');
            title.textContent = `${wardName} - ${shift}`;

            if (ward && ward.requirements[shift]) {
                const requirement = document.createElement('div');
                requirement.className = 'requirements';

                const reqValue = ward.requirements[shift];
                if (typeof reqValue === 'object') {
                    requirement.textContent = `Mínimo: ${reqValue.tecnico} técnicos e ${reqValue.enfermeiro} enfermeiros`;
                } else {
                    requirement.textContent = `Mínimo: ${reqValue} técnicos`;
                }
                title.appendChild(requirement);
            }

            const listElement = document.createElement('div');
            listElement.className = 'employee-list';
            listElement.setAttribute('data-ward', wardName);
            listElement.setAttribute('data-shift', shift);

            listElement.innerHTML = renderEmployeeList(groupedEmployees[key]);

            groupElement.appendChild(title);
            groupElement.appendChild(listElement);
            employeesBoard.appendChild(groupElement);
        }

        // Configurar funcionalidade de arrastar e soltar e os botões
        setupDragAndDrop();
        setupMoveButtons();
    }

    // Renderizar lista de funcionários
    function renderEmployeeList(employees) {
        if (employees.length === 0) {
            return '<div class="empty-state">Nenhum funcionário</div>';
        }

        return employees.map(employee => {
            const vacation = vacations.find(v => v.employeeId === employee.id);
            const vacationInfo = vacation ?
                `<br><small>Férias: ${formatDate(vacation.start)} - ${formatDate(vacation.end)}</small>` : '';

            return `
                        <div class="employee-item" draggable="true" data-id="${employee.id}">
                            <div>
                                <div class="employee-name">${employee.name}</div>
                                <div class="employee-role">${employee.role}${vacationInfo}</div>
                            </div>
                            <div class="employee-actions">
                                <button class="move-btn" onclick="openMoveModal('${employee.id}')" title="Mover para">
                                    <i class="fas fa-exchange"></i>
                                </button>
                                <button class="edit-btn" onclick="openVacationModal('${employee.id}')" title="Registrar Férias">
                                    <i class="fas fa-umbrella-beach"></i>
                                </button>
                                <button class="delete-btn" onclick="confirmDeleteEmployee('${employee.id}')" title="Excluir">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    `;
        }).join('');
    }

    // Configurar arrastar e soltar
    function setupDragAndDrop() {
        const employeeItems = document.querySelectorAll('.employee-item');
        const employeeLists = document.querySelectorAll('.employee-list');

        employeeItems.forEach(item => {
            item.addEventListener('dragstart', handleDragStart);
            item.addEventListener('dragend', handleDragEnd);
        });

        employeeLists.forEach(list => {
            list.addEventListener('dragover', handleDragOver);
            list.addEventListener('dragenter', handleDragEnter);
            list.addEventListener('dragleave', handleDragLeave);
            list.addEventListener('drop', handleDrop);
        });
    }

    // Configurar botões de "Mover para"
    function setupMoveButtons() {
        document.querySelectorAll('.move-btn').forEach(btn => {
            btn.addEventListener('click', function (e) {
                const employeeId = this.closest('.employee-item').getAttribute('data-id');
                openMoveModal(employeeId);
            });
        });
    }

    // Handlers para arrastar e soltar
    function handleDragStart(e) {
        draggedEmployee = this;
        this.classList.add('dragging');
        e.dataTransfer.setData('text/plain', this.getAttribute('data-id'));
    }

    function handleDragEnd() {
        this.classList.remove('dragging');
        draggedEmployee = null;
    }

    function handleDragOver(e) {
        e.preventDefault();
    }

    function handleDragEnter(e) {
        e.preventDefault();
        this.classList.add('highlight');
    }

    function handleDragLeave() {
        this.classList.remove('highlight');
    }

    function handleDrop(e) {
        e.preventDefault();
        this.classList.remove('highlight');

        const employeeId = e.dataTransfer.getData('text/plain');
        const targetWard = this.getAttribute('data-ward');
        const targetShift = this.getAttribute('data-shift');

        const employee = employees.find(emp => emp.id === employeeId);
        if (!employee) return;

        if (employee.ward === targetWard && employee.shift === targetShift) {
            return; // Não fazer nada se for o mesmo local
        }

        // Pedir confirmação
        showConfirmation(
            `Mover ${employee.name} de ${employee.ward} (${employee.shift}) para ${targetWard} (${targetShift})?`,
            () => moveEmployee(employeeId, targetWard, targetShift)
        );
    }

    // Mover funcionário entre enfermarias/turnos
    function moveEmployee(employeeId, newWard, newShift) {
        const index = employees.findIndex(emp => emp.id === employeeId);
        if (index === -1) return;

        employees[index].ward = newWard;
        employees[index].shift = newShift;

        localStorage.setItem(DB_KEYS.EMPLOYEES, JSON.stringify(employees));
        renderEmployeesBoard();
        checkRequirements();
    }

    // Mostrar modal de confirmação
    function showConfirmation(message, callback) {
        confirmationMessage.textContent = message;
        pendingAction = callback;
        confirmationModal.style.display = 'flex';
    }

    // Executar ação pendente após confirmação
    function executePendingAction() {
        if (pendingAction) {
            pendingAction();
            pendingAction = null;
        }
        confirmationModal.style.display = 'none';
    }

    // Adicionar funcionário
    function addEmployee(e) {
        e.preventDefault();

        const name = document.getElementById('name').value;
        const role = document.getElementById('role').value;
        const ward = document.getElementById('ward').value;
        const shift = document.getElementById('shift').value;

        const newEmployee = {
            id: generateId(),
            name,
            role,
            ward,
            shift
        };

        employees.push(newEmployee);
        localStorage.setItem(DB_KEYS.EMPLOYEES, JSON.stringify(employees));

        employeeForm.reset();
        renderEmployeesBoard();
        checkRequirements();
    }

    // Abrir modal de férias
    window.openVacationModal = function (employeeId) {
        const employee = employees.find(emp => emp.id === employeeId);
        if (!employee) return;

        document.getElementById('vacationEmployeeId').value = employeeId;
        document.getElementById('vacationStart').value = '';
        document.getElementById('vacationDays').value = '30';
        document.getElementById('vacationEnd').value = '';

        // Preencher data de início sugerida (15 dias a partir de hoje)
        const suggestedStart = new Date();
        suggestedStart.setDate(suggestedStart.getDate() + 15);
        document.getElementById('vacationStart').value = suggestedStart.toISOString().split('T')[0];

        // Calcular término automaticamente
        calculateVacationEnd();

        vacationModal.style.display = 'flex';
    };

    // Abrir modal de mover
    window.openMoveModal = function (employeeId) {
        const employee = employees.find(emp => emp.id === employeeId);
        if (!employee) return;

        document.getElementById('moveEmployeeId').value = employeeId;
        moveModal.style.display = 'flex';
    };

    // Confirmar e mover funcionário via modal
    function confirmMoveEmployee(e) {
        e.preventDefault();
        const employeeId = document.getElementById('moveEmployeeId').value;
        const newWard = document.getElementById('moveWard').value;
        const newShift = document.getElementById('moveShift').value;

        const employee = employees.find(emp => emp.id === employeeId);
        if (!employee) return;

        moveModal.style.display = 'none';

        showConfirmation(
            `Mover ${employee.name} de ${employee.ward} (${employee.shift}) para ${newWard} (${newShift})?`,
            () => moveEmployee(employeeId, newWard, newShift)
        );
    }

    // Calcular data de término das férias (excluindo fins de semana)
    function calculateVacationEnd() {
        const startDate = new Date(document.getElementById('vacationStart').value);
        const days = parseInt(document.getElementById('vacationDays').value);

        if (isNaN(startDate.getTime()) || isNaN(days)) {
            document.getElementById('vacationEnd').value = '';
            return;
        }

        let endDate = new Date(startDate);
        let addedDays = 0;

        while (addedDays < days) {
            endDate.setDate(endDate.getDate() + 1);
            // Ignorar sábados e domingos
            if (endDate.getDay() !== 0 && endDate.getDay() !== 6) {
                addedDays++;
            }
        }

        document.getElementById('vacationEnd').value = endDate.toISOString().split('T')[0];
    }

    // Salvar férias
    function saveVacation(e) {
        e.preventDefault();

        const employeeId = document.getElementById('vacationEmployeeId').value;
        const startDate = document.getElementById('vacationStart').value;
        const days = parseInt(document.getElementById('vacationDays').value);
        const endDate = document.getElementById('vacationEnd').value;

        // Verificar se já existem férias para este funcionário
        const existingIndex = vacations.findIndex(v => v.employeeId === employeeId);

        if (existingIndex !== -1) {
            vacations[existingIndex] = {
                employeeId,
                start: startDate,
                end: endDate,
                days
            };
        } else {
            vacations.push({
                employeeId,
                start: startDate,
                end: endDate,
                days
            });
        }

        localStorage.setItem(DB_KEYS.VACATIONS, JSON.stringify(vacations));

        vacationModal.style.display = 'none';
        renderEmployeesBoard();
        renderVacationLists();
        checkRequirements();
    }

    // Confirmar exclusão de funcionário
    window.confirmDeleteEmployee = function (employeeId) {
        const employee = employees.find(emp => emp.id === employeeId);
        if (!employee) return;

        showConfirmation(
            `Excluir ${employee.name} (${employee.role}) permanentemente?`,
            () => deleteEmployee(employeeId)
        );
    };

    // Excluir funcionário
    function deleteEmployee(employeeId) {
        employees = employees.filter(emp => emp.id !== employeeId);
        vacations = vacations.filter(v => v.employeeId !== employeeId);

        localStorage.setItem(DB_KEYS.EMPLOYEES, JSON.stringify(employees));
        localStorage.setItem(DB_KEYS.VACATIONS, JSON.stringify(vacations));

        renderEmployeesBoard();
        renderVacationLists();
        checkRequirements();
    }

    // Renderizar listas de férias
    function renderVacationLists() {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
        const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;

        // Férias do mês atual
        const currentVacationList = vacations.filter(v => {
            const start = new Date(v.start);
            const end = new Date(v.end);
            return (start.getMonth() === currentMonth && start.getFullYear() === currentYear) ||
                (end.getMonth() === currentMonth && end.getFullYear() === currentYear);
        });

        // Férias do próximo mês
        const nextVacationList = vacations.filter(v => {
            const start = new Date(v.start);
            const end = new Date(v.end);
            return (start.getMonth() === nextMonth && start.getFullYear() === nextYear) ||
                (end.getMonth() === nextMonth && end.getFullYear() === nextYear);
        });

        // Renderizar férias atuais
        if (currentVacationList.length === 0) {
            currentVacations.innerHTML = '<div class="empty-state">Nenhuma férias este mês</div>';
        } else {
            currentVacations.innerHTML = currentVacationList.map(v => {
                const employee = employees.find(emp => emp.id === v.employeeId);
                if (!employee) return '';

                return `
                            <div class="vacation-item">
                                <div>${employee.name} (${employee.role})</div>
                                <div>${employee.ward} - ${employee.shift}</div>
                                <div>${formatDate(v.start)} - ${formatDate(v.end)}</div>
                            </div>
                        `;
            }).join('');
        }

        // Renderizar próximas férias
        if (nextVacationList.length === 0) {
            nextVacations.innerHTML = '<div class="empty-state">Nenhuma férias no próximo mês</div>';
        } else {
            nextVacations.innerHTML = nextVacationList.map(v => {
                const employee = employees.find(emp => emp.id === v.employeeId);
                if (!employee) return '';

                return `
                            <div class="vacation-item">
                                <div>${employee.name} (${employee.role})</div>
                                <div>${employee.ward} - ${employee.shift}</div>
                                <div>${formatDate(v.start)} - ${formatDate(v.end)}</div>
                            </div>
                        `;
            }).join('');
        }
    }

    // Verificar requisitos mínimos
    function checkRequirements() {
        let alertMessages = [];

        // Verificar requisitos por enfermaria e turno
        wards.forEach(ward => {
            for (const shift in ward.requirements) {
                const reqValue = ward.requirements[shift];
                if (typeof reqValue === 'object') {
                    // Caso especial para SCIH
                    const tecnicos = employees.filter(emp => emp.ward === ward.name && emp.shift === shift && emp.role === 'Técnico em Enfermagem');
                    const enfermeiros = employees.filter(emp => emp.ward === ward.name && emp.shift === shift && emp.role === 'Enfermeiro');
                    if (tecnicos.length < reqValue.tecnico || enfermeiros.length < reqValue.enfermeiro) {
                        alertMessages.push(`${ward.name} - ${shift}: Faltam ${reqValue.tecnico - tecnicos.length} técnicos e ${reqValue.enfermeiro - enfermeiros.length} enfermeiros.`);
                    }
                } else {
                    const employeesInShift = employees.filter(emp =>
                        emp.ward === ward.name && emp.shift === shift && emp.role === 'Técnico em Enfermagem'
                    );

                    if (employeesInShift.length < reqValue) {
                        alertMessages.push(`${ward.name} - ${shift}: ${employeesInShift.length}/${reqValue} técnicos`);
                    }
                }
            }
        });

        // Verificar requisitos totais de enfermeiros
        for (const shift in nursesRequirements) {
            const nursesInShift = employees.filter(emp =>
                emp.role === 'Enfermeiro' && emp.shift === shift
            );

            if (nursesInShift.length < nursesRequirements[shift]) {
                alertMessages.push(`Enfermeiros no turno ${shift}: ${nursesInShift.length}/${nursesRequirements[shift]}`);
            }
        }

        // Exibir alertas se houver problemas
        if (alertMessages.length > 0) {
            alertMessage.innerHTML = `
                        <strong>Escala incompleta:</strong><br>
                        ${alertMessages.join('<br>')}
                    `;
            alertSection.classList.remove('hidden');
        } else {
            alertSection.classList.add('hidden');
        }
    }

    // Buscar funcionário
    function searchEmployee() {
        const searchTerm = searchInput.value.trim().toLowerCase();
        if (searchTerm === '') {
            searchResults.innerHTML = '';
            return;
        }

        const results = employees.filter(emp =>
            emp.name.toLowerCase().includes(searchTerm)
        );

        if (results.length === 0) {
            searchResults.innerHTML = '<div class="empty-state">Nenhum funcionário encontrado</div>';
            return;
        }

        searchResults.innerHTML = `
                    <h3>Resultados da busca:</h3>
                    ${results.map(emp => {
            const vacation = vacations.find(v => v.employeeId === emp.id);
            const vacationInfo = vacation ?
                ` (Férias: ${formatDate(vacation.start)} - ${formatDate(vacation.end)})` : '';

            return `
                            <div class="employee-item">
                                <div>
                                    <div class="employee-name">${emp.name}</div>
                                    <div class="employee-role">${emp.role} - ${emp.ward} (${emp.shift})${vacationInfo}</div>
                                </div>
                            </div>
                        `;
        }).join('')}
                `;
    }

    // Funções utilitárias
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    function formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR');
    }

    // Inicializar a aplicação
    init();
});