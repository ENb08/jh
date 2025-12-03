// POS System JavaScript
console.log("SuperMarket Pro POS Système Chargé");
        // Données initiales de démonstration
        const products = [
            {id:'89345678', name:'Riz Long 5kg', buy:4.00, sale:5.50, stock:50},
            {id:'12345678', name:'Lait UHT 1L', buy:0.80, sale:1.20, stock:4},
            {id:'55500011', name:'Café Moka 250g', buy:2.00, sale:3.50, stock:12},
            {id:'77008900', name:'Sucre 1kg', buy:0.60, sale:1.00, stock:0},
            {id:'99001234', name:'Huile 5L', buy:6.00, sale:8.50, stock:7},
        ];
        const TAX_RATE = 0.10;
        const stateFromStock = s => s>10 ? 'ok' : (s>0 ? 'low' : 'out');

        // Etat panier
        const cart = new Map(); // key: id, value: {product,qty}

        // Utilitaires
        const $ = id => document.getElementById(id);
        const formatMoney = v => v.toLocaleString('fr-FR', {minimumFractionDigits:2, maximumFractionDigits:2}) + ' €';

        // Rendu produits et stock
        function renderProducts(filterText = '', filterState = 'all') {
            const grid = $('productsGrid');
            grid.innerHTML = '';
            const list = products.filter(p => {
                const matchText = filterText.trim()==='' || (p.id+ ' ' + p.name).toLowerCase().includes(filterText.toLowerCase());
                const st = stateFromStock(p.stock);
                const matchState = filterState === 'all' || filterState === st;
                return matchText && matchState;
            });
            list.forEach(p => {
                const div = document.createElement('div');
                div.className = 'card-product';
                const state = stateFromStock(p.stock);
                div.innerHTML = `
                    <div class="prod-title">${p.name}</div>
                    <div class="prod-meta">Réf: ${p.id} — Prix: ${formatMoney(p.sale)} </div>
                    <div class="prod-meta">Stock: ${p.stock} ${p.stock<=5 && p.stock>0?'<span class="badge low">Bas</span>':''}${p.stock===0?'<span class="badge out">Rupture</span>':''}</div>
                    <div class="prod-actions">
                        <button class="btn" data-id="${p.id}" aria-label="Ajouter ${p.name}">Ajouter</button>
                        <div style="margin-left:auto;font-size:13px;color:var(--muted)">${state==='ok'?'<span class="badge ok">OK</span>':''}</div>
                    </div>
                `;
                grid.appendChild(div);
            });
            renderStockTable();
        }

        function renderStockTable(){
            const tbody = $('stockTable');
            tbody.innerHTML = '';
            products.forEach(p => {
                const tr = document.createElement('tr');
                const state = stateFromStock(p.stock);
                tr.innerHTML = `
                    <td>${p.id}</td>
                    <td>${p.name}</td>
                    <td>${formatMoney(p.sale)}</td>
                    <td>${p.stock}</td>
                    <td>${state==='ok'?'<span class="badge ok">En stock</span>':state==='low'?'<span class="badge low">Bas</span>':'<span class="badge out">Rupture</span>'}</td>
                    <td class="actions"><i class="fas fa-edit" data-edit="${p.id}" title="Modifier"></i><i class="fas fa-trash" data-del="${p.id}" title="Supprimer"></i></td>
                `;
                tbody.appendChild(tr);
            });
        }

        // Panier
        function addToCart(id, qty = 1){
            const product = products.find(p => p.id === id);
            if(!product) return alert('Produit introuvable');
            const currentQty = cart.has(id) ? cart.get(id).qty : 0;
            if(product.stock < currentQty + qty) {
                if(!confirm('Stock insuffisant. Ajouter quand même (vente à découvert) ?')) return;
            }
            cart.set(id, {product, qty: currentQty + qty});
            renderCart();
        }
        function removeFromCart(id){
            cart.delete(id);
            renderCart();
        }
        function changeQty(id, qty){
            if(qty <= 0){ removeFromCart(id); return; }
            cart.set(id, {...cart.get(id), qty});
            renderCart();
        }
        function renderCart(){
            const list = $('cartList');
            list.innerHTML = '';
            let subtotal = 0;
            let count = 0;
            cart.forEach(({product, qty}, id) => {
                const row = document.createElement('div');
                row.className = 'cart-row';
                row.innerHTML = `
                    <div style="flex:1">
                        <div style="font-weight:600">${product.name}</div>
                        <div class="small-muted">Réf: ${product.id}</div>
                    </div>
                    <div style="width:120px;text-align:right">
                        <div style="font-weight:700">${formatMoney(product.sale * qty)}</div>
                        <div class="qty">
                            <button data-dec="${id}">-</button>
                            <div style="width:28px;text-align:center">${qty}</div>
                            <button data-inc="${id}">+</button>
                        </div>
                        <div style="font-size:12px;margin-top:6px" class="small-muted"><i title="Supprimer" data-remove="${id}" class="fas fa-trash"></i></div>
                    </div>
                `;
                list.appendChild(row);
                subtotal += product.sale * qty;
                count += qty;
            });
            $('subtotal').textContent = formatMoney(subtotal);
            const tax = subtotal * TAX_RATE;
            $('tax').textContent = formatMoney(tax);
            const total = subtotal + tax;
            $('total').textContent = formatMoney(total);
            $('cart-count').textContent = `${count} article${count>1?'s':''}`;
        }

        // Checkout
        function checkout(){
            if(cart.size === 0) return alert('Le panier est vide');
            // déduire du stock
            cart.forEach(({product, qty}) => {
                const p = products.find(x => x.id === product.id);
                if(p) p.stock = Math.max(0, p.stock - qty);
            });
            // Générer ticket
            const receiptHtml = generateReceipt();
            $('receipt').innerHTML = receiptHtml;
            // vider panier
            cart.clear();
            renderCart();
            renderProducts($('search').value, $('filter-stock').value);
            alert('Encaissement effectué. Ticket généré (impression possible).');
        }

        function generateReceipt(){
            const now = new Date();
            let html = '<div style="font-family:Inter,Arial;width:320px;padding:10px">';
            html += '<h3>SuperMarket Pro</h3>';
            html += `<div>${now.toLocaleString('fr-FR')}</div><hr>`;
            let subtotal = 0;
            html += '<table style="width:100%">';
            cart.forEach(({product, qty}) => {
                html += `<tr><td>${product.name} x${qty}</td><td style="text-align:right">${formatMoney(product.sale * qty)}</td></tr>`;
                subtotal += product.sale * qty;
            });
            html += '</table><hr>';
            const tax = subtotal * TAX_RATE;
            const total = subtotal + tax;
            html += `<div style="display:flex;justify-content:space-between"><div>Sous-total</div><div>${formatMoney(subtotal)}</div></div>`;
            html += `<div style="display:flex;justify-content:space-between"><div>TVA</div><div>${formatMoney(tax)}</div></div>`;
            html += `<div style="display:flex;justify-content:space-between;font-weight:700"><div>Total</div><div>${formatMoney(total)}</div></div>`;
            html += '<p style="text-align:center;margin-top:10px">Merci pour votre achat !</p></div>';
            return html;
        }

        // PRINT
        function printReceipt(){
            const html = $('receipt').innerHTML || generateReceipt();
            const w = window.open('', 'PRINT', 'height=600,width=400');
            w.document.write('<html><head><title>Ticket</title></head><body>');
            w.document.write(html);
            w.document.write('</body></html>');
            w.document.close();
            w.focus();
            w.print();
            w.close();
        }

        // Export CSV (stock)
        function exportCSV(){
            let csv = 'Réf;Désignation;Prix;Stock\n';
            products.forEach(p => csv += `${p.id};${p.name};${p.sale};${p.stock}\n`);
            const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = 'stock_export.csv'; document.body.appendChild(a); a.click();
            setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 1000);
        }

        // Événements globaux
        document.addEventListener('DOMContentLoaded', () => {
            $('year').textContent = new Date().getFullYear();
            $('currentTime').textContent = new Date().toLocaleTimeString('fr-FR', {hour:'2-digit',minute:'2-digit'});

            renderProducts();
            renderCart();

            // délégation: ajouter produit depuis grille
            document.body.addEventListener('click', e => {
                if(e.target.matches('.card-product .btn') || e.target.closest('.card-product .btn')){
                    const btn = e.target.closest('button');
                    const id = btn.dataset.id;
                    addToCart(id);
                }
                if(e.target.dataset.inc){
                    const id = e.target.dataset.inc;
                    const item = cart.get(id);
                    changeQty(id, item.qty + 1);
                }
                if(e.target.dataset.dec){
                    const id = e.target.dataset.dec;
                    const item = cart.get(id);
                    changeQty(id, item.qty - 1);
                }
                if(e.target.dataset.remove){
                    removeFromCart(e.target.dataset.remove);
                }
                if(e.target.dataset.edit){
                    // placeholder: edition produit
                    const id = e.target.dataset.edit;
                    const p = products.find(x=>x.id===id);
                    if(p){
                        $('np-code').value = p.id; $('np-name').value = p.name; $('np-buy').value = p.buy; $('np-sale').value = p.sale; $('np-stock').value = p.stock;
                        openModal();
                        // save will update existing
                    }
                }
                if(e.target.dataset.del){
                    const id = e.target.dataset.del;
                    if(confirm('Supprimer le produit ?')) {
                        const idx = products.findIndex(x=>x.id===id);
                        if(idx>-1) products.splice(idx,1);
                        renderProducts($('search').value, $('filter-stock').value);
                    }
                }
            });

            // recherche, filtre, code-barre
            $('search').addEventListener('input', e => renderProducts(e.target.value, $('filter-stock').value));
            $('filter-stock').addEventListener('change', e => renderProducts($('search').value, e.target.value));
            $('btn-scan').addEventListener('click', () => {
                const code = $('barcode').value.trim();
                if(!code) return;
                const p = products.find(x => x.id === code);
                if(p) addToCart(p.id);
                else if(confirm('Produit non trouvé. Voulez-vous le créer ?')) openModal(code);
                $('barcode').value = '';
            });

            // new product modal
            $('btn-new-product').addEventListener('click', () => openModal());
            $('np-cancel').addEventListener('click', closeModal);
            $('np-save').addEventListener('click', () => {
                const code = $('np-code').value.trim() || Date.now().toString().slice(-8);
                const name = $('np-name').value.trim() || 'Produit';
                const buy = parseFloat($('np-buy').value) || 0;
                const sale = parseFloat($('np-sale').value) || 0;
                const stock = parseInt($('np-stock').value) || 0;
                const existing = products.find(p => p.id === code);
                if(existing){
                    existing.name = name; existing.buy = buy; existing.sale = sale; existing.stock = stock;
                } else {
                    products.unshift({id:code, name, buy, sale, stock});
                }
                closeModal();
                renderProducts($('search').value, $('filter-stock').value);
            });

            // checkout / print / export / reset
            $('btn-checkout').addEventListener('click', checkout);
            $('btn-print').addEventListener('click', printReceipt);
            $('btn-export').addEventListener('click', exportCSV);
            $('btn-reset').addEventListener('click', () => {
                if(confirm('Réinitialiser le panier et restaurer les données de démo ?')){
                    products.splice(0, products.length, 
                        {id:'89345678', name:'Riz Long 5kg', buy:4.00, sale:5.50, stock:50},
                        {id:'12345678', name:'Lait UHT 1L', buy:0.80, sale:1.20, stock:4},
                        {id:'55500011', name:'Café Moka 250g', buy:2.00, sale:3.50, stock:12},
                        {id:'77008900', name:'Sucre 1kg', buy:0.60, sale:1.00, stock:0},
                        {id:'99001234', name:'Huile 5L', buy:6.00, sale:8.50, stock:7},
                    );
                    cart.clear();
                    renderProducts();
                    renderCart();
                }
            });

            // accessibility: enter on barcode to add
            $('barcode').addEventListener('keydown', e => { if(e.key==='Enter') $('btn-scan').click(); });

            // helper: open/close modal
            function openModal(code = ''){ $('modalNew').classList.add('show'); if(code) $('np-code').value = code; }
            function closeModal(){ $('modalNew').classList.remove('show'); ['np-code','np-name','np-buy','np-sale','np-stock'].forEach(id=>$(id).value=''); }
            // close modal clicking outside
            document.getElementById('modalNew').addEventListener('click', e => { if(e.target.id === 'modalNew') closeModal(); });

        }); // DOMContentLoaded
   