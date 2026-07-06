"use client";

import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import { getCustomerMe } from "@/lib/api";
import type { Customer, CustomerAuthResponse } from "@/types/customer";

type CustomerAuthContextValue = {
    customer: Customer | null;
    token: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    saveCustomerSession: (response: CustomerAuthResponse) => void;
    updateCustomerSession: (customer: Customer) => void;
    logoutCustomer: () => void;
};

const CustomerAuthContext = createContext<CustomerAuthContextValue | undefined>(
    undefined,
);

const TOKEN_KEY = "bigotti-customer-token";
const CUSTOMER_KEY = "bigotti-customer";

function clearStoredCustomerSession() {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(CUSTOMER_KEY);
}

function readStoredCustomer() {
    const storedCustomer = window.localStorage.getItem(CUSTOMER_KEY);

    if (!storedCustomer) {
        return null;
    }

    try {
        return JSON.parse(storedCustomer) as Customer;
    } catch {
        window.localStorage.removeItem(CUSTOMER_KEY);
        return null;
    }
}

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const storedToken = window.localStorage.getItem(TOKEN_KEY);

        if (!storedToken) {
            clearStoredCustomerSession();
            setIsLoading(false);
            return;
        }

        setToken(storedToken);

        const storedCustomer = readStoredCustomer();

        if (storedCustomer?.isActive) {
            setCustomer(storedCustomer);
        }

        getCustomerMe(storedToken)
            .then((freshCustomer) => {
                if (!freshCustomer.isActive) {
                    throw new Error("Compte client désactivé.");
                }

                setCustomer(freshCustomer);
                window.localStorage.setItem(
                    CUSTOMER_KEY,
                    JSON.stringify(freshCustomer),
                );
            })
            .catch(() => {
                clearStoredCustomerSession();
                setToken(null);
                setCustomer(null);
            })
            .finally(() => setIsLoading(false));
    }, []);

    function saveCustomerSession(response: CustomerAuthResponse) {
        if (!response.accessToken || !response.customer?.isActive) {
            clearStoredCustomerSession();
            setToken(null);
            setCustomer(null);
            return;
        }

        window.localStorage.setItem(TOKEN_KEY, response.accessToken);
        window.localStorage.setItem(
            CUSTOMER_KEY,
            JSON.stringify(response.customer),
        );

        setToken(response.accessToken);
        setCustomer(response.customer);
    }

    function updateCustomerSession(updatedCustomer: Customer) {
        if (!updatedCustomer.isActive) {
            clearStoredCustomerSession();
            setToken(null);
            setCustomer(null);
            return;
        }

        window.localStorage.setItem(
            CUSTOMER_KEY,
            JSON.stringify(updatedCustomer),
        );

        setCustomer(updatedCustomer);
    }

    function logoutCustomer() {
        clearStoredCustomerSession();

        setToken(null);
        setCustomer(null);
    }

    const value = useMemo(
        () => ({
            customer,
            token,
            isLoading,
            isAuthenticated: Boolean(customer && token && customer.isActive),
            saveCustomerSession,
            updateCustomerSession,
            logoutCustomer,
        }),
        [customer, token, isLoading],
    );

    return (
        <CustomerAuthContext.Provider value={value}>
            {children}
        </CustomerAuthContext.Provider>
    );
}

export function useCustomerAuth() {
    const context = useContext(CustomerAuthContext);

    if (!context) {
        throw new Error(
            "useCustomerAuth doit être utilisé dans CustomerAuthProvider.",
        );
    }

    return context;
}
