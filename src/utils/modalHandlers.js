import { ref } from 'vue'

export const isOpenConfirmModal = ref(false);
export const confirmModalData = ref(null);

export const isOpenTransactionErrorModal = ref(false);

export const openConfirmModal = (confirmData) => {
    confirmModalData.value = confirmData;
    isOpenConfirmModal.value = true;
};

export const closeConfirmModal = () => {
    isOpenConfirmModal.value = false;
    confirmModalData.value = null;
};

export const openTransactionErrorModal = () => {
    isOpenTransactionErrorModal.value = true;
};

export const closeTransactionErrorModal = () => {
    isOpenTransactionErrorModal.value = false;
};