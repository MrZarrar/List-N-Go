// Save the shopping list and total price to Local Storage
function saveToLocalStorage() {
    const shoppingList = document.getElementById('shoppingList').innerHTML;
    const totalPrice = document.getElementById('totalPrice').textContent;

    localStorage.setItem('shoppingList', shoppingList);
    localStorage.setItem('totalPrice', totalPrice);
}

// Load the shopping list and total price from Local Storage
function loadFromLocalStorage() {
    const savedList = localStorage.getItem('shoppingList');
    const savedTotal = localStorage.getItem('totalPrice');

    if (savedList) {
        document.getElementById('shoppingList').innerHTML = savedList;

        // Reattach event listeners for the checkboxes
        const checkboxes = document.querySelectorAll('.item-checkbox');
        checkboxes.forEach((checkbox) => {
            checkbox.addEventListener('change', function () {
                const listItem = checkbox.closest('li');
                listItem.style.textDecoration = checkbox.checked ? 'line-through' : 'none';
                saveToLocalStorage();
                reorderItems();  // Ensure the list is reordered when a checkbox is clicked
            });
        });

        reorderItems();  // Ensure the list is ordered after loading from localStorage
    }

    if (savedTotal) {
        document.getElementById('totalPrice').textContent = savedTotal;
    }
}

// Add an item to the shopping list
function addItemToList(item, quantity, price) {
    const shoppingList = document.getElementById('shoppingList');
    const totalPriceElement = document.getElementById('totalPrice');

    const itemTotal = (price * quantity).toFixed(2);

    // Create the list item with a checkbox
    const listItem = document.createElement('li');
    listItem.innerHTML = `
        <input type="checkbox" class="item-checkbox">
        ${item} x ${quantity} - £${itemTotal}
    `;

    // Add event listener for checkbox toggle
    const checkbox = listItem.querySelector('.item-checkbox');
    checkbox.addEventListener('change', function () {
        listItem.style.textDecoration = checkbox.checked ? 'line-through' : 'none';
        saveToLocalStorage();
        reorderItems();  // Ensure the list is reordered when a checkbox is clicked
    });

    shoppingList.appendChild(listItem);

    // Update the total price
    const currentTotal = parseFloat(totalPriceElement.textContent.substring(1)) || 0;
    const newTotal = currentTotal + parseFloat(itemTotal);
    totalPriceElement.textContent = `£${newTotal.toFixed(2)}`;

    // Save to Local Storage
    saveToLocalStorage();

    reorderItems();  // Reorder items when a new one is added
}

// Reset the shopping list
document.getElementById('resetList').addEventListener('click', function () {
    document.getElementById('shoppingList').innerHTML = '';
    document.getElementById('totalPrice').textContent = '£0.00';
    localStorage.clear(); // Clear Local Storage
});

// Add an item when the "Add Item" button is clicked
// Add an item when the "Add Item" button is clicked
document.getElementById('addItem').addEventListener('click', async function () {
    const store = document.getElementById('store').value;
    const item = document.getElementById('item').value.trim();
    const quantity = parseInt(document.getElementById('quantity').value, 10);

    if (!item || !quantity) {
        showNotification('Please enter a valid item and quantity.');
        return;
    }

    // Clear the input fields immediately after the button is clicked
    document.getElementById('item').value = '';
    document.getElementById('quantity').value = '1';
    document.getElementById('item').focus(); // Refocus on the item input

    // Manually set the backend URL to your production URL
    const backendUrl = 'https://list-n-go-232454279663.us-central1.run.app';

    try {
        const response = await fetch(`https://list-n-go-232454279663.us-central1.run.app/get-price`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ store, item }),
        });

        const data = await response.json();

        if (response.ok) {
            const price = parseFloat(data.price);
            if (isNaN(price)) {
                showNotification('Invalid price received from server.');
                return;
            }

            addItemToList(item, quantity, price);
        } else {
            showNotification(data.error || 'An error occurred.');
        }
    } catch (error) {
        showNotification('Error fetching price. Please try again later.');
        console.error(error);
    }
});

// Listen for the Enter key to trigger the "Add Item" button
document.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
        document.getElementById('addItem').click();
    }
});

// Ensure quantity input only accepts numbers
document.getElementById('quantity').addEventListener('input', function (event) {
    this.value = this.value.replace(/[^0-9]/g, '');
});

// Show a notification message
function showNotification(message) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.color = 'red';
    document.body.appendChild(notification);

    setTimeout(() => {
        document.body.removeChild(notification);
    }, 3000);
}

// Load saved data when the page loads
document.addEventListener('DOMContentLoaded', loadFromLocalStorage);


// Function to reorder items based on checked state
function reorderItems() {
    const list = document.getElementById('shoppingList'); // Updated to use the correct list container
    const items = Array.from(list.children); // Get all the list items

    // Sort the items: checked items go to the end
    items.sort((a, b) => {
        const aChecked = a.querySelector('.item-checkbox').checked;
        const bChecked = b.querySelector('.item-checkbox').checked;

        // If 'a' is checked and 'b' is not, 'a' should come after 'b'
        return (aChecked === bChecked) ? 0 : aChecked ? 1 : -1;
    });

    // Reorder the DOM elements
    items.forEach(item => list.appendChild(item));
}