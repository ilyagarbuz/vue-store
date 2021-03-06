import Vue from 'vue'
import Vuex from 'vuex'
import axios from 'axios'
import { API_BASE_URL } from '@/config'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    cartProducts: [],
    userAccessKey: null,
    cartProductsData: null,
    orderInfo: null
  },
  mutations: {
    resetCart (state) {
      state.cartProducts = []
      state.cartProductsData = null
    },
    updateOrderInfo (state, orderInfo) {
      state.orderInfo = orderInfo
    },
    updateCartProductAmount (state, { productId, amount }) {
      const item = state.cartProducts.find(item => item.productId === productId)

      if (item) {
        item.amount = amount
      }
    },
    updateUserAccessKey (state, key) {
      this.state.userAccessKey = key
    },
    updateCartProductsData (state, data) {
      this.state.cartProductsData = data
    },
    updateCartProducts (state, productId) {
      state.cartProducts = state.cartProducts.filter(p => p.productId !== productId)
    },
    syncCartProducts (state) {
      this.state.cartProducts = this.state.cartProductsData.map(item => {
        return {
          productId: item.product.id,
          amount: item.quantity
        }
      })
    }
  },
  getters: {
    cartDetailProducts (state) {
      return state.cartProducts.map(item => {
        const product = state.cartProductsData.find(p => p.product.id === item.productId).product

        return {
          ...item,
          product: {
            ...product,
            image: product.image.file.url
          }
        }
      })
    },
    cartTotalPrice (state, getters) {
      return getters.cartDetailProducts.reduce((acc, item) => item.product.price * item.amount + acc, 0)
    },
    orderInfoDetails (state) {
      return state.orderInfo ? state.orderInfo : {}
    }
  },
  actions: {
    loadOrderInfo (context, orderId) {
      return axios.get(API_BASE_URL + '/api/orders/' + orderId, {
        params: {
          userAccessKey: context.state.userAccessKey
        }
      })
        .then(res => {
          context.commit('updateOrderInfo', res.data)
        })
    },
    loadCart (context) {
      return axios.get(API_BASE_URL + '/api/baskets', {
        params: {
          userAccessKey: context.state.userAccessKey
        }
      })
        .then(res => {
          if (!context.state.userAccessKey) {
            localStorage.setItem('userAccessKey', res.data.user.accessKey)
            context.commit('updateUserAccessKey', res.data.user.accessKey)
          }
          context.commit('updateCartProductsData', res.data.items)
          context.commit('syncCartProducts')
        })
    },
    addProductToCart (context, { productId, amount }) {
      return (new Promise(resolve => setTimeout(resolve, 2000)))
        .then(() => {
          return axios
            .post(API_BASE_URL + '/api/baskets/products', {
              productId: productId,
              quantity: amount
            }, {
              params: {
                userAccessKey: context.state.userAccessKey

              }
            })
            .then(res => {
              context.commit('updateCartProductsData', res.data.items)
              context.commit('syncCartProducts')
            })
        })
    },
    updateCartProductAmount (context, { productId, amount }) {
      context.commit('updateCartProductAmount', { productId, amount })

      if (amount < 1) {
        return
      }

      return axios
        .put(API_BASE_URL + '/api/baskets/products', {
          productId: productId,
          quantity: amount
        }, {
          params: {
            userAccessKey: context.state.userAccessKey

          }
        })
        .then(res => {
          context.commit('updateCartProductsData', res.data.items)
        })
        .catch(() => context.commit('syncCartProducts'))
    },
    deleteProduct (context, productId) {
      context.commit('updateCartProducts', productId)

      return axios
        .delete(API_BASE_URL + '/api/baskets/products', {
          data: {
            productId: productId
          },
          params: {
            userAccessKey: context.state.userAccessKey
          }
        })
        .then(res => {
          context.commit('updateCartProductsData', res.data.items)
        })
        .catch(() => context.commit('syncCartProducts'))
    }
  }
})
