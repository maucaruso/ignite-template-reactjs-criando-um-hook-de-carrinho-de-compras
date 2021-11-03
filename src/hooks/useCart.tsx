import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const newCart = [...cart];
      const productExisists = newCart.find(product => product.id === productId);

      const stock = await api.get(`/stock/${productId}`);
      const currentyStock = productExisists ? productExisists.amount : 0;
      const amount = currentyStock + 1;

      if (amount > stock.data.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (productExisists) {
        productExisists.amount = amount;
      } else {
        const getProduct = await api.get(`/products/${productId}`);
        const newProduct = {
          ...getProduct.data, 
          amount: amount
        };
        newCart.push(newProduct);
      }
      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const newCart = [...cart];

      const productExists = newCart.find(product => product.id === productId);

      if(!productExists) {
        toast.error('Erro na remoção do produto');
        return;
      }

      const cartWithoutProduct = newCart.filter(product => product.id !== productId);
      setCart(cartWithoutProduct);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartWithoutProduct));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount <= 0) {
        return;
      }

      const stock = await api.get(`/stock/${productId}`);

      if (stock.data.amount < amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const newCart = [...cart];
      const product = newCart.find(product => product.id === productId);

      if (product) {
        product.amount = amount;
      }
      
      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
