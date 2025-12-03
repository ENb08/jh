/* script.js */

// Fonction simple pour dire bonjour ou gérer des événements futurs
console.log("SuperMarket App Chargée");

// Exemple de fonction pour la page Caisse (POS)
// Simulation d'ajout au panier (visuel uniquement pour l'instant)
function addToCart(productName, price) {
    const cartContainer = document.querySelector('.cart-items');
    
    // Si nous sommes sur la page POS
    if (cartContainer) {
        const newItem = document.createElement('div');
        newItem.style.display = "flex";
        newItem.style.justifyContent = "space-between";
        newItem.style.marginBottom = "5px";
        
        newItem.innerHTML = `
            <span>${productName}</span>
            <strong>${price} $</strong>
        `;
        
        cartContainer.appendChild(newItem);
        alert(productName + " ajouté au ticket !");
    }
}