import React, { useState, useEffect } from 'react';
import { Search, ShoppingCart, Plus, Minus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Product } from '../types';
import { useCartStore } from '../store/cartStore';

function POS() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [receivedAmount, setReceivedAmount] = useState<number>(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'wave' | 'orange'>('cash');
  
  const { items, addItem, removeItem, updateQuantity, total, clearCart } = useCartStore();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/products', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setProducts(data.products);
      }
    } catch (error) {
      toast.error('Failed to fetch products');
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.reference.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePayment = async () => {
    if (paymentMethod === 'cash') {
      if (receivedAmount < total) {
        toast.error('Received amount is less than total');
        return;
      }
      
      const change = receivedAmount - total;
      toast.success(`Change to return: $${change.toFixed(2)}`);
    } else {
      // Implement Wave or Orange Money payment
      toast.info(`Processing ${paymentMethod} payment...`);
      // Add your payment gateway integration here
    }

    try {
      // Update stock for all items
      for (const item of items) {
        await fetch(`http://localhost:8000/api/products/${item.id}/update-stock`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ quantity: item.quantity }),
        });
      }

      clearCart();
      setShowPaymentModal(false);
      setReceivedAmount(0);
      toast.success('Sale completed successfully');
    } catch (error) {
      toast.error('Error processing sale');
    }
  };

  return (
    <div className="h-[calc(100vh-2rem)] flex gap-4">
      {/* Products Section */}
      <div className="flex-1 bg-white rounded-lg shadow-sm p-4 overflow-hidden flex flex-col">
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto flex-1">
          {filteredProducts.map((product) => (
            <button
              key={product.id}
              onClick={() => addItem(product)}
              className="p-4 border rounded-lg hover:shadow-md transition-shadow text-left"
            >
              <h3 className="font-medium truncate">{product.name}</h3>
              <p className="text-sm text-gray-500">{product.reference}</p>
              <p className="text-lg font-bold mt-2">${product.price.toFixed(2)}</p>
              <p className="text-sm text-gray-500">Stock: {product.stock}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Cart Section */}
      <div className="w-96 bg-white rounded-lg shadow-sm p-4 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Cart</h2>
          <ShoppingCart className="w-6 h-6" />
        </div>

        <div className="flex-1 overflow-y-auto">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between py-2 border-b">
              <div className="flex-1">
                <h3 className="font-medium">{item.name}</h3>
                <p className="text-sm text-gray-500">${item.price.toFixed(2)}</p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => updateQuantity(item.id, Math.max(0, item.quantity - 1))}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-8 text-center">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <Plus className="w-4  h-4" />
                </button>
                <button
                  onClick={() => removeItem(item.id)}
                  className="p-1 hover:bg-gray-100 rounded text-red-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t pt-4 mt-4">
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
          <button
            onClick={() => setShowPaymentModal(true)}
            disabled={items.length === 0}
            className="w-full mt-4 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-300"
          >
            Proceed to Payment
          </button>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Payment</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'wave' | 'orange')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200"
                >
                  <option value="cash">Cash</option>
                  <option value="wave">Wave</option>
                  <option value="orange">Orange Money</option>
                </select>
              </div>

              {paymentMethod === 'cash' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Received Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={receivedAmount}
                    onChange={(e) => setReceivedAmount(Number(e.target.value))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200"
                  />
                  {receivedAmount > total && (
                    <p className="text-green-600 mt-2">
                      Change: ${(receivedAmount - total).toFixed(2)}
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-end space-x-2 mt-6">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePayment}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  Complete Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default POS;