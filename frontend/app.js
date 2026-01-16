document.addEventListener('DOMContentLoaded', () => {
    const loginContainer = document.getElementById('login-container');
    const appContainer = document.getElementById('app-container');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const taskInput = document.getElementById('taskInput');
    const addTaskBtn = document.getElementById('addTask');
    const taskList = document.getElementById('taskList');
    const logoutBtn = document.getElementById('logout-btn');
    const displayUsername = document.getElementById('display-username');
    const navShipments = document.getElementById('nav-shipments');
    const navTrucks = document.getElementById('nav-trucks');
    const navProfile = document.getElementById('nav-profile');
    const navAdmin = document.getElementById('nav-admin');
    const navDashboard = document.getElementById('nav-dashboard');

    const shipmentsView = document.getElementById('shipments-view');
    const trucksView = document.getElementById('trucks-view');
    const profileView = document.getElementById('profile-view');
    const dashboardView = document.getElementById('dashboard-view');

    const adminManagementView = document.getElementById('admin-management-view');
    const adminCreateView = document.getElementById('admin-create-view');
    const profileForm = document.getElementById('profile-form');
    const profileMsg = document.getElementById('profile-msg');
    const createUserForm = document.getElementById('create-user-form');
    const createUserMsg = document.getElementById('create-user-msg');
    const shipmentForm = document.getElementById('shipment-form');
    const shipmentList = document.getElementById('shipmentList');

    // Truck Elements
    const truckForm = document.getElementById('truck-form');
    const truckMsg = document.getElementById('truck-msg');

    // Toggle Shipment Views
    window.toggleShipmentView = (view) => {
        const inputSection = document.querySelector('.shipment-input');
        const listSection = document.querySelector('.shipment-list-container');

        if (view === 'create') {
            inputSection.style.display = 'block';
            listSection.style.display = 'none';
        } else {
            inputSection.style.display = 'none';
            listSection.style.display = 'block';
            loadShipments(); // Refresh list when returning
        }
    };

    const truckInputSection = document.querySelector('.truck-input');
    const btnGoToCreate = document.getElementById('btn-go-to-create');
    const btnBackToMgmt = document.getElementById('btn-back-to-mgmt');


    // Check auth status on load
    checkAuthStatus();

    let userRole = '';
    let dashboardChart = null;
    let timelineChart = null;

    // Navigation logic
    function deactivateAll() {
        navShipments.classList.remove('active');
        navTrucks.classList.remove('active');
        navProfile.classList.remove('active');
        navAdmin.classList.remove('active');
        navDashboard.classList.remove('active');
        shipmentsView.style.display = 'none';
        trucksView.style.display = 'none';
        profileView.style.display = 'none';
        dashboardView.style.display = 'none';
        adminManagementView.style.display = 'none';
        adminCreateView.style.display = 'none';
    }

    navDashboard.addEventListener('click', () => {
        deactivateAll();
        navDashboard.classList.add('active');
        dashboardView.style.display = 'block';
        loadDashboard();
    });


    navShipments.addEventListener('click', () => {
        deactivateAll();
        navShipments.classList.add('active');
        shipmentsView.style.display = 'block';

        // Default to list view
        if (window.toggleShipmentView) {
            window.toggleShipmentView('list');
        } else {
            // Fallback if function not ready (unlikely)
            shipmentsView.querySelector('.shipment-input').style.display = 'none';
        }

        loadShipments();
    });

    navTrucks.addEventListener('click', async () => {
        deactivateAll();
        navTrucks.classList.add('active');
        trucksView.style.display = 'block';

        // Initialize view state (List by default)
        window.toggleTruckView('list');

        await loadDrivers(); // Needed for assignment
        await loadTrucks();
    });

    navProfile.addEventListener('click', async () => {
        deactivateAll();
        navProfile.classList.add('active');
        profileView.style.display = 'block';
        await loadProfile();

        // Disable save button for driver role
        const profileSaveBtn = profileForm.querySelector('.save-btn');
        if (userRole === 'driver') {
            profileSaveBtn.style.display = 'none';
            profileForm.querySelectorAll('input').forEach(input => input.disabled = true);
            profileMsg.textContent = 'Read-only profile (Driver Role)';
            profileMsg.className = 'msg info';
        } else {
            profileSaveBtn.style.display = 'block';
            profileForm.querySelectorAll('input').forEach(input => input.disabled = false);
        }
    });

    navAdmin.addEventListener('click', () => {
        deactivateAll();
        navAdmin.classList.add('active');
        adminManagementView.style.display = 'block';
        loadAdminUsers();
    });

    btnGoToCreate.addEventListener('click', () => {
        deactivateAll();
        navAdmin.classList.add('active');
        adminCreateView.style.display = 'block';
        createUserForm.reset();
        createUserMsg.textContent = '';
    });

    btnBackToMgmt.addEventListener('click', () => {
        deactivateAll();
        navAdmin.classList.add('active');
        adminManagementView.style.display = 'block';
        loadAdminUsers();
    });


    const editUserModal = document.getElementById('editUserModal');
    const editUserForm = document.getElementById('edit-user-form');
    const closeEditModalBtn = document.getElementById('closeEditModal');

    closeEditModalBtn.addEventListener('click', () => {
        editUserModal.style.display = 'none';
    });




    // Auth Logic
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        loginError.textContent = '';
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            if (response.ok) {
                await checkAuthStatus();
            } else {
                const data = await response.json();
                loginError.textContent = data.message || 'Login failed';
            }
        } catch (err) {
            loginError.textContent = 'Connection error';
        }
    });

    logoutBtn.addEventListener('click', async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        showLogin();
    });

    // Profile Logic
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const full_name = document.getElementById('profile-name').value;
        const email = document.getElementById('profile-email').value;
        profileMsg.textContent = 'Saving...';
        profileMsg.className = 'msg';
        try {
            const response = await fetch('/api/user/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ full_name, email })
            });
            if (response.ok) {
                profileMsg.textContent = 'Profile updated successfully!';
                profileMsg.className = 'msg success';
                setTimeout(() => profileMsg.textContent = '', 3000);
            } else {
                profileMsg.textContent = 'Update failed';
                profileMsg.className = 'msg error';
            }
        } catch (err) {
            profileMsg.textContent = 'Connection error';
            profileMsg.className = 'msg error';
        }
    });

    async function loadProfile() {
        try {
            const response = await fetch('/api/user/profile');
            if (response.status === 401) return showLogin();
            const data = await response.json();
            document.getElementById('profile-username').value = data.username || '';
            document.getElementById('profile-name').value = data.full_name || '';
            document.getElementById('profile-email').value = data.email || '';
            document.getElementById('profile-role').value = data.role.toUpperCase() || '';
        } catch (err) {
            console.error('Error loading profile:', err);
        }
    }

    // Admin Logic
    createUserForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('new-username').value;
        const password = document.getElementById('new-password').value;
        const full_name = document.getElementById('new-fullname').value;
        const email = document.getElementById('new-email').value;
        const role = document.getElementById('new-role').value;
        createUserMsg.textContent = 'Creating user...';
        createUserMsg.className = 'msg';
        try {
            const response = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, full_name, email, role })
            });
            const data = await response.json();
            if (response.ok) {
                createUserMsg.textContent = 'User created successfully!';
                createUserMsg.className = 'msg success';
                createUserForm.reset();
                loadAdminUsers(); // Refresh the list
                setTimeout(() => createUserMsg.textContent = '', 3000);
            } else {
                createUserMsg.textContent = data.message || 'Creation failed';
                createUserMsg.className = 'msg error';
            }
        } catch (err) {
            createUserMsg.textContent = 'Connection error';
            createUserMsg.className = 'msg error';
        }
    });

    async function loadAdminUsers() {
        try {
            const response = await fetch('/api/admin/users');
            if (response.status === 401) return showLogin();
            if (response.status === 403) return;
            const users = await response.json();
            renderUserTable(users);
        } catch (err) {
            console.error('Error loading admin users:', err);
        }
    }

    function renderUserTable(users) {
        const body = document.getElementById('userListBody');
        body.innerHTML = '';
        users.forEach(user => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${user.id}</td>
                <td>${user.username}</td>
                <td>${user.full_name || '-'}</td>
                <td>${user.email || '-'}</td>
                <td><span class="status-badge" style="background: rgba(255,255,255,0.05)">${user.role}</span></td>
                <td>
                    <button class="edit-btn" onclick='window.openEditModal(${JSON.stringify(user)})'>Edit</button>
                    <button class="edit-btn" style="background: var(--accent); margin-left: 0.5rem;" onclick='window.openChangePasswordModal(${user.id})'>Pw</button>
                </td>
            `;
            body.appendChild(tr);
        });
    }

    window.openEditModal = (user) => {
        document.getElementById('edit-user-id').value = user.id;
        document.getElementById('edit-username').value = user.username;
        document.getElementById('edit-fullname').value = user.full_name || '';
        document.getElementById('edit-email').value = user.email || '';
        document.getElementById('edit-role').value = user.role;
        editUserModal.style.display = 'flex';
    };

    editUserForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-user-id').value;
        const full_name = document.getElementById('edit-fullname').value;
        const email = document.getElementById('edit-email').value;
        const role = document.getElementById('edit-role').value;

        try {
            const response = await fetch(`/api/admin/users/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ full_name, email, role })
            });

            if (response.ok) {
                editUserModal.style.display = 'none';
                loadAdminUsers();
            } else {
                alert('Failed to update user');
            }
        } catch (err) {
            console.error('Error updating user:', err);
        }
    });


    // --- Change Password Logic ---
    const changePasswordModal = document.getElementById('changePasswordModal');
    const changePasswordForm = document.getElementById('change-password-form');
    const closeChangePasswordBtn = document.getElementById('closeChangePasswordModal');

    window.openChangePasswordModal = (userId) => {
        document.getElementById('cp-user-id').value = userId;
        document.getElementById('cp-new-password').value = '';
        changePasswordModal.style.display = 'flex';
    };

    closeChangePasswordBtn.addEventListener('click', () => {
        changePasswordModal.style.display = 'none';
    });

    changePasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userId = document.getElementById('cp-user-id').value;
        const password = document.getElementById('cp-new-password').value;

        try {
            const response = await fetch(`/api/admin/users/${userId}/password`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });

            if (response.ok) {
                alert('Password updated successfully');
                changePasswordModal.style.display = 'none';
            } else {
                const data = await response.json();
                alert('Failed to update password: ' + (data.message || data.error));
            }
        } catch (err) {
            console.error('Error updating password:', err);
            alert('Connection error');
        }
    });


    // Helper Functions
    async function checkAuthStatus() {
        try {
            const response = await fetch('/api/auth/status');
            const data = await response.json();
            if (data.authenticated) {
                userRole = data.role.toLowerCase();
                console.log('Current Role:', userRole);

                displayUsername.textContent = data.username;
                navAdmin.style.display = (userRole === 'admin') ? 'block' : 'none';

                // Show Trucks ONLY for Admin
                navTrucks.style.display = (userRole === 'admin') ? 'block' : 'none';

                // Show Dashboard for Admin and User
                navDashboard.style.display = (userRole === 'admin' || userRole === 'user') ? 'block' : 'none';

                console.log('Nav Trucks Display:', navTrucks.style.display);
                showApp();
            } else {
                showLogin();
            }
        } catch (err) {
            showLogin();
        }
    }

    function showLogin() {
        loginContainer.style.display = 'block';
        appContainer.style.display = 'none';
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
    }

    function showApp() {
        loginContainer.style.display = 'none';
        appContainer.style.display = 'block';

        // Default to Dashboard for Admin/User, Shipments for Driver
        if (userRole === 'admin' || userRole === 'user') {
            navDashboard.click();
        } else {
            navShipments.click();
        }
    }

    // === CARGO BUILDER LOGIC ===
    let cargoItems = [];
    const addItemBtn = document.getElementById('addItemBtn');
    const cargoItemsList = document.getElementById('cargoItemsList');

    if (addItemBtn) { // Safety check
        addItemBtn.addEventListener('click', () => {
            const type = document.getElementById('itemType').value;
            const volume = parseFloat(document.getElementById('itemVolume').value) || 0;
            const weight = parseFloat(document.getElementById('itemWeight').value) || 0;
            const qty = parseInt(document.getElementById('itemQty').value) || 1;

            if (volume <= 0 || weight <= 0) {
                alert('Please enter valid volume and weight');
                return;
            }

            const item = { type, volume, weight, qty, id: Date.now() };
            cargoItems.push(item);
            renderCargoItems();

            // clearing inputs
            document.getElementById('itemVolume').value = '';
            document.getElementById('itemWeight').value = '';
            document.getElementById('itemQty').value = '1';
        });
    }

    function renderCargoItems() {
        cargoItemsList.innerHTML = '';
        let totalW = 0;
        let totalV = 0;
        let totalP = 0;
        let totalB = 0;

        cargoItems.forEach(item => {
            const vol = item.volume || 0;
            totalW += item.weight * item.qty;
            totalV += vol * item.qty;
            if (item.type === 'Pallet') totalP += item.qty;
            if (item.type === 'Box') totalB += item.qty;

            const div = document.createElement('div');
            div.style.cssText = 'background: rgba(255,255,255,0.05); padding: 0.5rem; margin-top: 0.5rem; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; font-size: 0.9em;';
            div.innerHTML = `
                <span>${item.qty}x <strong>${item.type}</strong> (${item.volume} m³, ${item.weight}kg)</span>
                <button type="button" onclick="window.removeCargoItem(${item.id})" style="background: none; border: none; color: #ff4444; cursor: pointer;">&times;</button>
            `;
            cargoItemsList.appendChild(div);
        });

        document.getElementById('totalWeight').value = totalW.toFixed(2);
        document.getElementById('totalVolume').value = totalV.toFixed(3);
        document.getElementById('totalPallets').value = totalP;
        document.getElementById('totalBoxes').value = totalB;
    }

    window.removeCargoItem = (id) => {
        cargoItems = cargoItems.filter(i => i.id !== id);
        renderCargoItems();
    };

    // === MAP PICKER LOGIC ===
    let mapPicker = null;
    let mapPickerMarker = null;
    let activeMapField = null; // 'origin' or 'dest'

    window.openMapPicker = (field) => {
        activeMapField = field;
        const modal = document.getElementById('mapModal');
        modal.style.display = 'flex';

        // Get current values if editing
        const currentLat = parseFloat(document.getElementById(field + 'Lat').value);
        const currentLng = parseFloat(document.getElementById(field + 'Lng').value);

        // Get "Other" values (e.g. if picking Dest, look at Origin) for context
        const otherField = field === 'origin' ? 'dest' : 'origin';
        const otherLat = parseFloat(document.getElementById(otherField + 'Lat').value);
        const otherLng = parseFloat(document.getElementById(otherField + 'Lng').value);

        if (!mapPicker) {
            mapPicker = L.map('leafletMap');
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(mapPicker);

            // Add Search Control
            L.Control.geocoder({
                defaultMarkGeocode: false
            })
                .on('markgeocode', function (e) {
                    const { center, name, bbox } = e.geocode;
                    const lat = center.lat;
                    const lng = center.lng;

                    // Update View
                    mapPicker.setView([lat, lng], 16);

                    // Update Marker
                    if (mapPickerMarker) mapPicker.removeLayer(mapPickerMarker);
                    mapPickerMarker = L.marker([lat, lng]).addTo(mapPicker);

                    // Update Form Inputs
                    if (activeMapField === 'origin') {
                        document.getElementById('originLat').value = lat.toFixed(6);
                        document.getElementById('originLng').value = lng.toFixed(6);
                        const currentAddr = document.getElementById('origin').value;
                        if (!currentAddr || currentAddr.trim() === '') {
                            document.getElementById('origin').value = name;
                        }
                    } else {
                        document.getElementById('destLat').value = lat.toFixed(6);
                        document.getElementById('destLng').value = lng.toFixed(6);
                        const currentAddr = document.getElementById('destination').value;
                        if (!currentAddr || currentAddr.trim() === '') {
                            document.getElementById('destination').value = name;
                        }
                    }
                })
                .addTo(mapPicker);

            mapPicker.on('click', (e) => {
                const { lat, lng } = e.latlng;

                if (mapPickerMarker) mapPicker.removeLayer(mapPickerMarker);
                mapPickerMarker = L.marker([lat, lng]).addTo(mapPicker);

                if (activeMapField === 'origin') {
                    document.getElementById('originLat').value = lat.toFixed(6);
                    document.getElementById('originLng').value = lng.toFixed(6);
                } else {
                    document.getElementById('destLat').value = lat.toFixed(6);
                    document.getElementById('destLng').value = lng.toFixed(6);
                }

                setTimeout(() => document.getElementById('mapModal').style.display = 'none', 500);
            });
        }

        // Logic to set view
        if (mapPickerMarker) mapPicker.removeLayer(mapPickerMarker);

        // 1. Focus on existing value
        if (!isNaN(currentLat) && !isNaN(currentLng)) {
            mapPicker.setView([currentLat, currentLng], 15);
            mapPickerMarker = L.marker([currentLat, currentLng]).addTo(mapPicker);
        }
        // 2. Focus on "Other" location (e.g. start at Origin when picking Dest)
        else if (!isNaN(otherLat) && !isNaN(otherLng)) {
            mapPicker.setView([otherLat, otherLng], 13);
        }
        // 3. Default
        else {
            mapPicker.setView([13.7563, 100.5018], 10);
        }

        setTimeout(() => mapPicker.invalidateSize(), 200);
    };



    let editingShipmentId = null;

    // === SHIPMENT SUBMIT ===
    shipmentForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const payload = {
            cargo_name: document.getElementById('cargoName').value,
            description: document.getElementById('description').value,
            origin: document.getElementById('origin').value,
            origin_lat: document.getElementById('originLat').value,
            origin_lng: document.getElementById('originLng').value,
            destination: document.getElementById('destination').value,
            dest_lat: document.getElementById('destLat').value,
            dest_lng: document.getElementById('destLng').value,
            weight: parseFloat(document.getElementById('totalWeight').value) || 0, // Master weight from calc
            total_volume: parseFloat(document.getElementById('totalVolume').value) || 0,
            pallet_qty: parseInt(document.getElementById('totalPallets').value) || 0,
            box_qty: parseInt(document.getElementById('totalBoxes').value) || 0,
            consignee_name: document.getElementById('consigneeName').value,
            consignee_phone: document.getElementById('consigneePhone').value,
            consignee_address: document.getElementById('consigneeAddress').value,
            delivery_remark: document.getElementById('deliveryRemark').value,
            pickup_time: document.getElementById('pickupTime').value || null,
            delivery_time: document.getElementById('deliveryTime').value || null,
            cargo_items: cargoItems
        };

        try {
            let url = '/api/shipments';
            let method = 'POST';

            if (editingShipmentId) {
                url = `/api/shipments/${editingShipmentId}`;
                method = 'PUT';
            }

            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                shipmentForm.reset();
                cargoItems = [];
                renderCargoItems();
                editingShipmentId = null; // Reset edit mode
                window.toggleShipmentView('list'); // Return to list view
                // UX Improvement: Auto-refresh list after creation
                loadShipments();
            } else {
                const errData = await response.json();
                alert('Error saving shipment: ' + (errData.message || 'Unknown error'));
            }
        } catch (err) {
            console.error('Error adding shipment:', err);
            alert('Connection error');
        }
    });

    let drivers = [];

    async function loadDrivers() {
        try {
            const response = await fetch('/api/drivers');
            if (response.ok) {
                drivers = await response.json();
            }
        } catch (err) {
            console.error('Error loading drivers:', err);
        }
    }

    let trucks = []; // Store trucks globally for assignment
    let allShipmentsData = []; // Store for filtering

    async function loadTrucks() {
        try {
            const response = await fetch('/api/trucks');
            if (response.ok) {
                trucks = await response.json();
                if (trucksView.style.display === 'block') {
                    renderTruckTable(trucks);
                }
            }
        } catch (err) {
            console.error('Error loading trucks', err);
        }
    }

    async function loadShipments() {
        try {
            const response = await fetch('/api/shipments');
            if (response.status === 401) return showLogin();
            allShipmentsData = await response.json();

            // All roles except driver might need truck list for assignment
            if (userRole !== 'driver') {
                await loadTrucks();
            }
            filterAndRenderShipments(); // Use filter
        } catch (err) {
            console.error('Error loading shipments:', err);
        }
    }



    function filterAndRenderShipments() {
        const filterFrom = document.getElementById('filter-date-from').value;
        const filterTo = document.getElementById('filter-date-to').value;

        let filtered = allShipmentsData;

        // Helper for date comparison (YYYY-MM-DD)
        const toDateString = (iso) => {
            if (!iso) return null;
            const d = new Date(iso);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        if (filterFrom) {
            filtered = filtered.filter(s => {
                const createdDate = toDateString(s.created_at);
                return createdDate >= filterFrom;
            });
        }

        if (filterTo) {
            filtered = filtered.filter(s => {
                const createdDate = toDateString(s.created_at);
                return createdDate <= filterTo;
            });
        }

        renderShipments(filtered);
    }

    // Init Logic for Filter (Default: Last 2 Weeks to Today)
    const initDateFilter = () => {
        const fromInput = document.getElementById('filter-date-from');
        const toInput = document.getElementById('filter-date-to');

        if (fromInput && toInput) {
            const today = new Date();
            const twoWeeksAgo = new Date();
            twoWeeksAgo.setDate(today.getDate() - 14);

            const formatDate = (date) => {
                const yyyy = date.getFullYear();
                const mm = String(date.getMonth() + 1).padStart(2, '0');
                const dd = String(date.getDate()).padStart(2, '0');
                return `${yyyy}-${mm}-${dd}`;
            };

            // Set Default (Last 2 Weeks to Today)
            fromInput.value = formatDate(twoWeeksAgo);
            toInput.value = formatDate(today);

            // Add Listeners
            fromInput.addEventListener('change', filterAndRenderShipments);
            toInput.addEventListener('change', filterAndRenderShipments);
        }
    };
    // Call init immediately
    initDateFilter();


    window.editShipment = (id) => {
        const shipment = allShipmentsData.find(s => s.id === id);
        if (!shipment) return;

        editingShipmentId = shipment.id;

        // Switch to Create View but change title
        window.toggleShipmentView('create');
        const titleEl = document.querySelector('.shipment-input h3');
        if (titleEl) titleEl.textContent = `Edit Shipment #${String(id).padStart(5, '0')}`;

        // Populate Inputs
        document.getElementById('cargoName').value = shipment.cargo_name;
        document.getElementById('description').value = shipment.description || '';
        document.getElementById('origin').value = shipment.origin;
        document.getElementById('originLat').value = shipment.origin_lat || '';
        document.getElementById('originLng').value = shipment.origin_lng || '';
        document.getElementById('destination').value = shipment.destination;
        document.getElementById('destLat').value = shipment.dest_lat || '';
        document.getElementById('destLng').value = shipment.dest_lng || '';

        document.getElementById('consigneeName').value = shipment.consignee_name || '';
        document.getElementById('consigneePhone').value = shipment.consignee_phone || '';
        document.getElementById('consigneeAddress').value = shipment.consignee_address || '';
        document.getElementById('deliveryRemark').value = shipment.delivery_remark || '';

        // Dates (Check format matching datetime-local: YYYY-MM-DDTHH:MM)
        // Helper to format Date obj to Input string
        const toInputString = (dateStr) => {
            if (!dateStr) return '';
            const d = new Date(dateStr);
            // Adjust to local ISO without Z
            const pad = (n) => String(n).padStart(2, '0');
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        };

        document.getElementById('pickupTime').value = toInputString(shipment.pickup_time);
        document.getElementById('deliveryTime').value = toInputString(shipment.delivery_time);

        // Cargo Items
        cargoItems = shipment.cargo_items || [];
        renderCargoItems();
    };

    // Modification to toggleShipmentView to reset if passing 'create' without edit
    const originalToggle = window.toggleShipmentView;
    window.toggleShipmentView = (view) => {
        if (view === 'create' && !editingShipmentId) {
            const titleEl = document.querySelector('.shipment-input h3');
            if (titleEl) titleEl.textContent = 'Create New Shipment';
            shipmentForm.reset();
            cargoItems = [];
            renderCargoItems();
        }
        // Call original logic (which is likely inline in HTML or defined earlier... wait, I added it in previous session inline in index.html, 
        // NO, defined in app.js? searching for it)
        // If it's defined in index.html, i can't wrap it easily.
        // Let's check where toggleShipmentView is defined.

        // ... Wait, I recall adding it to app.js earlier? Or index.html?
        // Step 638 checks lines 31 of app.js.

        // If I can't find original, I'll just redefine the UI logic here.
        const shipmentsView = document.getElementById('shipments-view');
        const createSection = shipmentsView.querySelector('.shipment-input');
        const listSection = shipmentsView.querySelector('.shipment-list-container');

        if (view === 'create') {
            createSection.style.display = 'block';
            listSection.style.display = 'none';
        } else {
            createSection.style.display = 'none';
            listSection.style.display = 'block';
            // Also reset edit mode if leaving
            if (view === 'list') {
                editingShipmentId = null;
                const titleEl = document.querySelector('.shipment-input h3');
                if (titleEl) titleEl.textContent = 'Create New Shipment';
            }
        }
    };

    function renderShipments(shipments) {
        shipmentList.innerHTML = '';

        if (shipments.length === 0) {
            shipmentList.innerHTML = '<p class="msg info">No shipments found.</p>';
            return;
        }

        const formatDate = (dateStr) => {
            if (!dateStr) return '-';
            return new Date(dateStr).toLocaleDateString() + ' ' + new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        };

        // DRIVER VIEW: Cards (Mobile Friendly)
        if (userRole === 'driver') {
            shipmentList.classList.remove('table-view'); // Ensure default grid/flex style if any
            shipments.forEach(s => {
                const card = document.createElement('div');
                card.className = 'shipment-card';
                card.innerHTML = `
                    <div class="shipment-header">
                        <span class="shipment-id">#${String(s.id).padStart(5, '0')}</span>
                        <span class="status-badge status-${s.status.toLowerCase().replace(' ', '-')}">${s.status}</span>
                    </div>
                    <div class="shipment-details">
                        <div class="detail-item">
                            <span class="detail-label">Cargo</span>
                            <span class="detail-value">${s.cargo_name}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Route</span>
                            <span class="detail-value">${s.origin} &rarr; ${s.destination}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Pickup</span>
                            <span class="detail-value">${formatDate(s.pickup_time)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Delivery</span>
                            <span class="detail-value">${formatDate(s.delivery_time)}</span>
                        </div>
                         <div class="detail-item">
                            <span class="detail-label">Weight</span>
                            <span class="detail-value">${s.weight} kg</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Truck</span>
                            <span class="detail-value">${s.truck_plate ? `<strong style="color:var(--primary)">${s.truck_plate}</strong>` : 'Unassigned'}</span>
                        </div>
                    </div>

                    <div class="card-actions" style="margin-top: 1rem; border-top: 1px solid var(--glass); padding-top: 1rem; display: flex; justify-content: space-between; align-items: center;">
                        <div style="display:flex; gap: 0.5rem;">
                            <button onclick="window.viewDetails(${s.id})" class="btn-secondary" style="font-size: 0.8rem; padding: 0.4rem 0.8rem;">View Details</button>
                            ${(userRole !== 'driver' && (s.status === 'Pending' || s.status === 'Assigned')) ?
                        `<button onclick="window.editShipment(${s.id})" class="btn-secondary" style="font-size: 0.8rem; padding: 0.4rem 0.8rem;">Edit</button>
                         <button onclick="window.cancelShipment(${s.id})" class="btn-secondary" style="font-size: 0.8rem; padding: 0.4rem 0.8rem; color: #ff4444; border-color: #ff4444; margin-left: 0.5rem; margin-top:0;">Cancel</button>` : ''
                    }
                        </div>
                        <div style="display:flex; gap: 0.5rem;">
                             ${renderActions(s)}
                        </div>
                    </div>
                `;
                shipmentList.appendChild(card);
            });
            return;
        }

        // ADMIN/USER VIEW: Table (Desktop Friendly)
        const table = document.createElement('table');
        table.className = 'shipment-table';
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.marginTop = '1rem';

        // Table Header
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr style="border-bottom: 1px solid var(--border); text-align: left;">
                <th style="padding: 1rem;">ID</th>
                <th style="padding: 1rem;">Status</th>
                <th style="padding: 1rem;">Cargo</th>
                <th style="padding: 1rem;">Route</th>
                <th style="padding: 1rem;">Pickup</th>
                <th style="padding: 1rem;">Delivery</th>
                <th style="padding: 1rem;">Truck</th>
                <th style="padding: 1rem;">Actions</th>
            </tr>
        `;
        table.appendChild(thead);

        const tbody = document.createElement('tbody');

        shipments.forEach(s => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid var(--glass)';
            tr.innerHTML = `
                <td style="padding: 1rem;">#${String(s.id).padStart(5, '0')}</td>
                <td style="padding: 1rem;"><span class="status-badge status-${s.status.toLowerCase().replace(' ', '-')}">${s.status}</span></td>
                <td style="padding: 1rem;">
                    <div><strong>${s.cargo_name}</strong></div>
                    <div style="font-size: 0.8em; opacity: 0.7;">${s.weight} kg</div>
                </td>
                <td style="padding: 1rem;">
                    <div>${s.origin} &rarr; ${s.destination}</div>
                </td>
                <td style="padding: 1rem; font-size: 0.9em;">${formatDate(s.pickup_time)}</td>
                <td style="padding: 1rem; font-size: 0.9em;">${formatDate(s.delivery_time)}</td>
                <td style="padding: 1rem;">
                    ${s.truck_plate ? `<strong style="color:var(--primary)">${s.truck_plate}</strong>` : '<span style="opacity:0.5">Unassigned</span>'}
                </td>
                <td style="padding: 1rem;">
                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                        <button onclick="window.viewDetails(${s.id})" class="btn-secondary" style="padding: 0.3rem 0.6rem; font-size: 0.75rem;">🔍</button>
                        ${(userRole !== 'driver' && (s.status === 'Pending' || s.status === 'Assigned')) ?
                    `<button onclick="window.editShipment(${s.id})" class="btn-secondary" style="padding: 0.3rem 0.6rem; font-size: 0.75rem;">✎</button>
                     <button onclick="window.cancelShipment(${s.id})" class="btn-secondary" style="padding: 0.3rem 0.6rem; font-size: 0.75rem; color: #ff4444; border-color: #ff4444; margin-left: 0.2rem;">🗑</button>` : ''
                }
                        ${renderActions(s)}
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        table.appendChild(tbody);
        shipmentList.appendChild(table);
    }

    function renderActions(s) {
        let html = '';

        // Admin/User Assignment Actions
        if ((userRole === 'admin' || userRole === 'user') && s.status === 'Pending') {
            html += `
                <select onchange="window.assignTruck(${s.id}, this.value)" class="dispatch-select" style="padding: 0.5rem; width: auto;">
                    <option value="">Assign Truck</option>
                    ${trucks.map(t => `<option value="${t.id}">${t.license_plate} (${t.model})</option>`).join('')}
                </select>
            `;
        }

        // Status Update Actions (Available for everyone based on backend auth)
        // Admin/User can override. Driver can update if assigned.
        // We show buttons if status allows progression.

        if (s.status === 'Assigned' || s.status === 'Pending') { // Pending only for override
            // Admin/User override or Driver start
            if (s.status === 'Assigned' || (userRole !== 'driver')) {
                html += `<button onclick="window.updateShipmentStatus(${s.id}, 'In Transit')" class="save-btn" style="padding: 0.5rem; margin-left: 0.5rem; font-size: 0.8rem;">Start Trip</button>`;
            }
        }

        if (s.status === 'In Transit') {
            html += `<button onclick="window.openPodModal(${s.id})" class="save-btn" style="padding: 0.5rem; margin-left: 0.5rem; font-size: 0.8rem; background: var(--success);">Complete</button>`;
        }

        return html;
    }

    async function updateShipmentStatus(id, status, podSignature = null, podImage = null) {
        try {
            const response = await fetch(`/api/shipments/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, pod_signature: podSignature, pod_image: podImage })
            });
            if (response.ok) loadShipments();
        } catch (err) {
            console.error('Error updating status:', err);
        }
    }

    async function assignTruck(id, truck_id) {

        if (!truck_id) return;
        try {
            const response = await fetch(`/api/shipments/${id}/assign`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ truck_id })
            });
            if (response.ok) loadShipments();
        } catch (err) {
            console.error('Error assigning truck:', err);
        }
    }

    window.updateShipmentStatus = updateShipmentStatus;
    window.assignTruck = assignTruck;

    window.cancelShipment = async (id) => {
        if (!confirm('Are you sure you want to cancel this shipment? This cannot be undone.')) return;

        try {
            const response = await fetch(`/api/shipments/${id}`, {
                method: 'DELETE'
            });
            const data = await response.json();
            if (response.ok) {
                alert('Shipment cancelled');
                loadShipments();
            } else {
                alert('Error: ' + data.message);
            }
        } catch (err) {
            console.error('Error cancelling shipment:', err);
            alert('Connection error');
        }
    };

    // --- Truck Management Logic ---
    let editingTruckId = null;

    window.toggleTruckView = (mode) => {
        const listSec = document.getElementById('truck-list-section');
        const formSec = document.getElementById('truck-form-section');
        const form = document.getElementById('truck-form');
        const msg = document.getElementById('truck-msg');
        const title = document.getElementById('truck-form-title');

        if (mode === 'create') {
            listSec.style.display = 'none';
            formSec.style.display = 'block';

            // Populate Driver Select
            const driverSelect = document.getElementById('truckDriver');
            driverSelect.innerHTML = '<option value="">Select Driver (Optional)</option>' +
                drivers.map(d => `<option value="${d.id}">${d.full_name || d.username}</option>`).join('');

            // If not editing (fresh create), clear form
            if (!editingTruckId) {
                form.reset();
                title.textContent = 'Register New Truck';
            }
        } else {
            listSec.style.display = 'block';
            formSec.style.display = 'none';
            editingTruckId = null; // Reset edit state
            msg.textContent = '';
        }
    };

    window.editTruck = (id) => {
        const truck = trucks.find(t => t.id === id);
        if (!truck) return;

        editingTruckId = truck.id;
        document.getElementById('licensePlate').value = truck.license_plate || '';
        document.getElementById('truckModel').value = truck.model || '';
        document.getElementById('truckCapacity').value = truck.capacity || '';

        document.getElementById('truck-form-title').textContent = `Edit Truck #${truck.license_plate}`;
        window.toggleTruckView('create');

        // Set all field values after populating dropdown
        setTimeout(() => {
            document.getElementById('truckDriver').value = truck.driver_id || '';
            document.getElementById('truckType').value = truck.truck_type || '';
            document.getElementById('fuelType').value = truck.fuel_type || '';
            document.getElementById('truckYear').value = truck.year || '';
            document.getElementById('truckVin').value = truck.vin || '';
            document.getElementById('truckMileage').value = truck.mileage || '';
            document.getElementById('containerSize').value = truck.container_size || '';
            document.getElementById('registrationExpiry').value = truck.registration_expiry ? truck.registration_expiry.split('T')[0] : '';
            document.getElementById('insuranceExpiry').value = truck.insurance_expiry ? truck.insurance_expiry.split('T')[0] : '';
            document.getElementById('truckNotes').value = truck.notes || '';
        }, 0);
    };

    async function loadTrucks() {
        try {
            const res = await fetch('/api/trucks');
            trucks = await res.json();
            renderTrucks(trucks);
            // Optionally refresh shipment list if needed for dropdowns
            if (userRole !== 'driver' && typeof loadShipments === 'function') {
                // loadShipments(); // Optional
            }
        } catch (err) {
            console.error('Error loading trucks:', err);
        }
    }

    function renderTrucks(list) {
        const tbody = document.getElementById('truckListBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        list.forEach(t => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="padding: 1rem;">#${t.id}</td>
                <td style="padding: 1rem; font-weight: 600;">${t.license_plate}</td>
                <td style="padding: 1rem; color: var(--text-muted);">${t.model}</td>
                <td style="padding: 1rem;">${t.capacity} kg</td>
                <td style="padding: 1rem;">
                    <span class="status-badge status-${t.status === 'Available' ? 'Success' : 'Pending'}">
                        ${t.status}
                    </span>
                </td>
                <td style="padding: 1rem;">${t.driver_name ? `<span style="color:#fff">${t.driver_name}</span>` : '<span style="opacity:0.5">-</span>'}</td>
                <td style="padding: 1rem;">
                     <button onclick="window.editTruck(${t.id})" class="btn-secondary" style="padding: 0.3rem 0.6rem; font-size: 0.75rem;">✎ Edit</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    document.getElementById('truck-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const license_plate = document.getElementById('licensePlate').value;
        const model = document.getElementById('truckModel').value;
        const capacity = document.getElementById('truckCapacity').value;
        const driver_id = document.getElementById('truckDriver').value;
        const truck_type = document.getElementById('truckType').value;
        const fuel_type = document.getElementById('fuelType').value;
        const year = document.getElementById('truckYear').value;
        const vin = document.getElementById('truckVin').value;
        const mileage = document.getElementById('truckMileage').value;
        const registration_expiry = document.getElementById('registrationExpiry').value;
        const insurance_expiry = document.getElementById('insuranceExpiry').value;
        const notes = document.getElementById('truckNotes').value;
        const container_size = document.getElementById('containerSize').value;
        const msg = document.getElementById('truck-msg');
        const form = document.getElementById('truck-form');

        const payload = { license_plate, model, capacity, driver_id, truck_type, fuel_type, year, vin, mileage, registration_expiry, insurance_expiry, notes, container_size };

        try {
            let response;
            if (editingTruckId) {
                // Update
                response = await fetch(`/api/trucks/${editingTruckId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } else {
                // Create
                response = await fetch('/api/trucks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            }

            const data = await response.json();

            if (response.ok) {
                msg.textContent = editingTruckId ? 'Truck updated!' : 'Truck registered!';
                msg.className = 'msg success';
                if (!editingTruckId) form.reset();

                setTimeout(() => {
                    window.toggleTruckView('list');
                    loadTrucks();
                }, 1000);
            } else {
                msg.textContent = data.message || 'Error saving truck';
                msg.className = 'msg error';
            }
        } catch (err) {
            msg.textContent = 'Server error';
            msg.className = 'msg error';
        }
    });

    // Map state
    let routeMap = null;
    let detailShipment = null;

    window.viewDetails = async (id) => {
        const shipments = await (await fetch('/api/shipments')).json(); // Naive fetch again for simplicity, ideally lookup from local list
        detailShipment = shipments.find(s => s.id === id);

        if (!detailShipment) return;

        const d = detailShipment;
        document.getElementById('detail-id').textContent = `Shipment #${String(d.id).padStart(5, '0')}`;
        document.getElementById('d-cargo').textContent = d.cargo_name;
        document.getElementById('d-status').textContent = d.status;

        // Locations
        document.getElementById('d-origin-addr').textContent = d.origin;
        document.getElementById('d-origin-lat').textContent = d.origin_lat || '-';
        document.getElementById('d-origin-lng').textContent = d.origin_lng || '-';
        const originMapBtn = document.getElementById('d-origin-map');
        if (d.origin_lat && d.origin_lng) {
            originMapBtn.href = `https://www.google.com/maps/search/?api=1&query=${d.origin_lat},${d.origin_lng}`;
            originMapBtn.style.display = 'inline-flex';
        } else {
            originMapBtn.style.display = 'none';
        }

        document.getElementById('d-dest-addr').textContent = d.destination;
        document.getElementById('d-dest-lat').textContent = d.dest_lat || '-';
        document.getElementById('d-dest-lng').textContent = d.dest_lng || '-';
        const destMapBtn = document.getElementById('d-dest-map');
        if (d.dest_lat && d.dest_lng) {
            destMapBtn.href = `https://www.google.com/maps/search/?api=1&query=${d.dest_lat},${d.dest_lng}`;
            destMapBtn.style.display = 'inline-flex';
        } else {
            destMapBtn.style.display = 'none';
        }

        // Consignee
        document.getElementById('d-c-name').textContent = d.consignee_name || '-';
        document.getElementById('d-c-phone').textContent = d.consignee_phone || '-';
        document.getElementById('d-c-address').textContent = d.consignee_address || '-';
        document.getElementById('d-c-remark').textContent = d.delivery_remark || '-';

        // POD Section
        const podSection = document.getElementById('d-pod-section');
        const podSigContainer = document.getElementById('d-pod-sig-container');
        const podImgContainer = document.getElementById('d-pod-img-container');
        const podSigImg = document.getElementById('d-pod-signature');
        const podImg = document.getElementById('d-pod-image');

        if (d.status === 'Delivered' && (d.pod_signature || d.pod_image)) {
            podSection.style.display = 'block';

            if (d.pod_signature) {
                podSigContainer.style.display = 'block';
                podSigImg.src = d.pod_signature;
            } else {
                podSigContainer.style.display = 'none';
            }

            if (d.pod_image) {
                podImgContainer.style.display = 'block';
                podImg.src = d.pod_image;
            } else {
                podImgContainer.style.display = 'none';
            }
        } else {
            podSection.style.display = 'none';
        }

        // Schedule
        const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleString() : '-';
        document.getElementById('d-created').textContent = formatDate(d.created_at);
        document.getElementById('d-pickup').textContent = formatDate(d.pickup_time);
        document.getElementById('d-delivery').textContent = formatDate(d.delivery_time);

        // Update Google Maps Link
        const gmapsBtn = document.getElementById('btn-open-gmaps');
        if (gmapsBtn) {
            const glat1 = parseFloat(d.origin_lat);
            const glng1 = parseFloat(d.origin_lng);
            const glat2 = parseFloat(d.dest_lat);
            const glng2 = parseFloat(d.dest_lng);
            if (!isNaN(glat1) && !isNaN(glng1) && !isNaN(glat2) && !isNaN(glng2)) {
                gmapsBtn.href = `https://www.google.com/maps/dir/?api=1&origin=${glat1},${glng1}&destination=${glat2},${glng2}&travelmode=driving`;
                gmapsBtn.style.display = 'inline-flex';
            } else {
                gmapsBtn.style.display = 'none';
            }
        }

        // Items
        const tbody = document.getElementById('d-items-body');
        tbody.innerHTML = '';
        if (d.cargo_items && d.cargo_items.length > 0) {
            d.cargo_items.forEach(item => {
                tbody.innerHTML += `
                    <tr>
                        <td style="padding: 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.1);">${item.type}</td>
                        <td style="padding: 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.1);">${item.volume ? item.volume + ' m³' : (item.l ? item.l + 'x' + item.w + 'x' + item.h : '-')}</td>
                        <td style="padding: 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.1);">${item.weight}</td>
                        <td style="padding: 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.1);">${item.qty}</td>
                    </tr>
                `;
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="4" style="padding: 1rem; text-align: center; opacity: 0.5;">No cargo details logged</td></tr>';
        }

        // Map
        if (routeMap) {
            routeMap.off();
            routeMap.remove(); // Reset map
        }

        // 1. Initialize map centered on South East Asia (Thailand)
        routeMap = L.map('routeMap').setView([13.7563, 100.5018], 6);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(routeMap);

        document.getElementById('detailsModal').style.display = 'flex';

        // 2. Wait for modal transition/render, then fix size and add route
        setTimeout(() => {
            if (routeMap) {
                routeMap.invalidateSize();

                const lat1 = parseFloat(d.origin_lat);
                const lng1 = parseFloat(d.origin_lng);
                const lat2 = parseFloat(d.dest_lat);
                const lng2 = parseFloat(d.dest_lng);

                if (!isNaN(lat1) && !isNaN(lng1) && !isNaN(lat2) && !isNaN(lng2)) {
                    L.Routing.control({
                        waypoints: [
                            L.latLng(lat1, lng1),
                            L.latLng(lat2, lng2)
                        ],
                        routeWhileDragging: false,
                        show: false,
                        addWaypoints: false,
                        draggableWaypoints: false,
                        fitSelectedRoutes: true, // This should work correctly now that map size is known
                        lineOptions: {
                            styles: [{ color: 'blue', opacity: 0.6, weight: 6 }]
                        },
                        createMarker: function (i, wp, nWps) {
                            if (i === 0) return L.marker(wp.latLng).bindPopup("<b>Origin</b>");
                            if (i === nWps - 1) return L.marker(wp.latLng).bindPopup("<b>Destination</b>");
                            return null;
                        }
                    }).addTo(routeMap);
                }
            }
        }, 300);
    };


    function renderTruckTable(trucks) {
        const body = document.getElementById('truckListBody');
        body.innerHTML = '';
        trucks.forEach(t => {
            const tr = document.createElement('tr');
            const assignUi = (userRole === 'admin') ? `
                <select onchange="window.assignTruckDriver(${t.id}, this.value)" class="dispatch-select" style="padding: 0.2rem;">
                    <option value="">${t.driver_id ? 'Change Driver' : 'Assign Driver'}</option>
                    <option value="">-- Unassign --</option>
                    ${drivers.map(d => `<option value="${d.id}" ${d.id === t.driver_id ? 'selected' : ''}>${d.full_name || d.username}</option>`).join('')}
                </select>
            ` : '';

            tr.innerHTML = `
                <td>${t.id}</td>
                <td><strong style="color: var(--accent);">${t.license_plate}</strong></td>
                <td>${t.model}</td>
                <td>${t.capacity} kg</td>
                <td><span class="status-badge" style="background: rgba(255,255,255,0.05)">${t.status}</span></td>
                <td>${t.driver_name || '<span style="opacity:0.5">Unassigned</span>'}</td>
                <td>${assignUi}</td>
            `;
            body.appendChild(tr);
        });
    }

    window.assignTruckDriver = async (truckId, driverId) => {
        try {
            const response = await fetch(`/api/trucks/${truckId}/assign`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ driver_id: driverId })
            });
            if (response.ok) {
                loadTrucks();
            } else {
                const data = await response.json();
                alert('Failed to assign driver: ' + (data.message || data.error || response.statusText));
            }
        } catch (err) {
            console.error(err);
        }
    };




    async function loadDashboard() {
        try {
            const response = await fetch('/api/dashboard');
            if (!response.ok) return; // Likely 403 for driver
            const data = await response.json();

            // Update KPI Cards
            document.getElementById('kpi-total-shipments').textContent = data.total_shipments;
            document.getElementById('kpi-total-volume').textContent = data.total_volume;
            document.getElementById('kpi-total-weight').textContent = data.total_weight;
            document.getElementById('kpi-active-trucks').textContent = data.active_trucks;
            document.getElementById('kpi-total-trucks').textContent = `of ${data.total_trucks} total trucks`;
            document.getElementById('kpi-in-transit').textContent = data.in_transit;
            document.getElementById('kpi-delivered').textContent = data.delivered;

            // Render Charts
            console.log('Dashboard Data:', data);
            renderDashboardChart(data);
            if (data.timeline) {
                renderTimelineChart(data.timeline);
            } else {
                console.warn('No timeline data found');
            }
        } catch (err) {
            console.error('Error loading dashboard:', err);
        }
    }


    function renderDashboardChart(data) {
        const ctx = document.getElementById('shipmentChart').getContext('2d');

        if (dashboardChart) {
            dashboardChart.destroy();
        }

        dashboardChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Pending', 'Assigned', 'In Transit', 'Delivered'],
                datasets: [{
                    data: [data.pending, data.assigned, data.in_transit, data.delivered],
                    backgroundColor: [
                        'rgba(255, 255, 255, 0.1)', // Pending
                        '#002664',                  // Assigned (Navy)
                        '#3498db',                  // In Transit (Bright Blue)
                        '#00b140'                   // Delivered (Nippon Green)
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { color: '#ccc' }
                    }
                }
            }
        });
    }

    function renderTimelineChart(timelineData) {
        const ctx = document.getElementById('timelineChart').getContext('2d');

        if (timelineChart) {
            timelineChart.destroy();
        }

        // Process Data (ensure all days are represented or just plot available points)
        // For simplicity, we plot available points. Ideally, we fill gaps.
        const labels = timelineData.map(item => {
            const d = new Date(item.day);
            return `${d.getDate()}/${d.getMonth() + 1}`;
        });
        const counts = timelineData.map(item => parseInt(item.count));

        timelineChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Shipments',
                    data: counts,
                    borderColor: '#00b140', // Nippon Green
                    backgroundColor: 'rgba(0, 177, 64, 0.1)',
                    borderWidth: 2,
                    tension: 0.4, // Smooth curves
                    fill: true,
                    pointBackgroundColor: '#002664',
                    pointBorderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { color: '#888', stepSize: 1 },
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    },
                    x: {
                        ticks: { color: '#888' },
                        grid: { display: false }
                    }
                }
            }
        });
    }

    // --- ePOD (Electronic Proof of Delivery) Logic ---
    let podModal, signaturePad, clearSigBtn, podImageInput, confirmDeliveryBtn, closePodModalBtn, sigCtx;
    let isDrawing = false;
    let pendingShipmentIdForPod = null;
    let podImageBase64 = null;

    // Initialize elements safely
    function initPodElements() {
        podModal = document.getElementById('podModal');
        signaturePad = document.getElementById('signaturePad');
        clearSigBtn = document.getElementById('clearSignature');
        podImageInput = document.getElementById('podImageInput');
        confirmDeliveryBtn = document.getElementById('confirmDeliveryBtn');
        closePodModalBtn = document.getElementById('closePodModal');

        if (signaturePad) {
            sigCtx = signaturePad.getContext('2d');

            // Events - Remove old if any (not easily possible with anonymous, but assignment overwrites if we were rigorous, here we just add new ones which is ok for single run)
            // But to avoid duplicates on re-init, we rely on checking if elements exist.

            signaturePad.addEventListener('mousedown', startDrawing);
            signaturePad.addEventListener('mousemove', draw);
            signaturePad.addEventListener('mouseup', stopDrawing);
            signaturePad.addEventListener('mouseout', stopDrawing);
            signaturePad.addEventListener('touchstart', startDrawing);
            signaturePad.addEventListener('touchmove', draw);
            signaturePad.addEventListener('touchend', stopDrawing);
        }

        if (clearSigBtn) clearSigBtn.onclick = clearSignature; // using onclick to override potential previous listeners
        if (closePodModalBtn) closePodModalBtn.onclick = closePod;
        if (podImageInput) podImageInput.onchange = handleImageUpload;
        if (confirmDeliveryBtn) confirmDeliveryBtn.onclick = submitPod;
    }

    function clearSignature() {
        if (sigCtx && signaturePad) sigCtx.clearRect(0, 0, signaturePad.width, signaturePad.height);
    }

    function closePod() {
        if (podModal) podModal.style.display = 'none';
        pendingShipmentIdForPod = null;
    }

    function handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800;
                let width = img.width;
                let height = img.height;

                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Compress to JPEG 60%
                podImageBase64 = canvas.toDataURL('image/jpeg', 0.6);
                const previewText = document.getElementById('imagePreviewText');
                if (previewText) previewText.textContent = `Image loaded (${Math.round(podImageBase64.length / 1024)}KB)`;
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    async function submitPod() {
        if (!pendingShipmentIdForPod) return;
        const signatureData = signaturePad ? signaturePad.toDataURL() : null;

        try {
            await updateShipmentStatus(pendingShipmentIdForPod, 'Delivered', signatureData, podImageBase64);
            closePod();
            clearSignature();
            if (podImageInput) podImageInput.value = '';
            podImageBase64 = null;
            const previewText = document.getElementById('imagePreviewText');
            if (previewText) previewText.textContent = '';
        } catch (err) {
            alert('Failed to submit POD: ' + err.message);
        }
    }

    // Drawing Functions
    function getPos(e) {
        const rect = signaturePad.getBoundingClientRect();
        let clientX = e.clientX;
        let clientY = e.clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        }
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    function startDrawing(e) {
        e.preventDefault();
        isDrawing = true;
        const pos = getPos(e);
        sigCtx.beginPath();
        sigCtx.moveTo(pos.x, pos.y);
    }

    function draw(e) {
        if (!isDrawing) return;
        e.preventDefault();
        const pos = getPos(e);
        sigCtx.lineWidth = 2;
        sigCtx.lineCap = 'round';
        sigCtx.strokeStyle = '#000';
        sigCtx.lineTo(pos.x, pos.y);
        sigCtx.stroke();
    }

    function stopDrawing(e) {
        if (isDrawing) {
            isDrawing = false;
        }
    }

    // Initialize
    initPodElements();

    // Expose Global
    window.openPodModal = (shipmentId) => {
        if (!podModal) {
            console.error('POD Modal not initialized');
            initPodElements(); // Try again
            if (!podModal) {
                alert('Error: ePOD Modal not found. Refresh page.');
                return;
            }
        }
        pendingShipmentIdForPod = shipmentId;
        podModal.style.display = 'flex';
        // Resize canvas
        if (signaturePad && signaturePad.parentElement) {
            const rect = signaturePad.parentElement.getBoundingClientRect();
            signaturePad.width = rect.width;
            signaturePad.height = 200;
            // Re-get context to be safe if size changed drastically? No context persists.
        }
    };
});


