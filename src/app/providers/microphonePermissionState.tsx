"use client"
import React, { createContext, useContext, useEffect, useState } from "react";

// Define the possible permission states
export type PermissionState = "granted" | "denied" | "prompt" | "unknown";

// Define the context type
interface MicrophonePermissionContextType {
    permission: PermissionState;
}

const MicrophonePermissionContext = createContext<MicrophonePermissionContextType | undefined>(undefined);

export const MicrophonePermissionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [permission, setPermission] = useState<PermissionState>("unknown");

    useEffect(() => {
        let permissionStatus: PermissionStatus;

        async function subscribeToPermissionChanges() {
            try {
                permissionStatus = await navigator.permissions.query({ name: "microphone" as PermissionName });
                setPermission(permissionStatus.state as PermissionState);

                // Listen for changes
                permissionStatus.onchange = () => {
                    setPermission(permissionStatus.state as PermissionState);
                };
            } catch (error) {
                console.error("Permission API not supported", error);
            }
        }

        subscribeToPermissionChanges();

        return () => {
            if (permissionStatus) {
                permissionStatus.onchange = null; // Cleanup listener
            }
        };
    }, []);

    return (
        <MicrophonePermissionContext.Provider value={{ permission }}>
            {children}
        </MicrophonePermissionContext.Provider>
    );
};

// Hook to consume the microphone permission context
export const useMicrophonePermission = (): MicrophonePermissionContextType => {
    const context = useContext(MicrophonePermissionContext);
    if (!context) {
        throw new Error("useMicrophonePermission must be used within a MicrophonePermissionProvider");
    }
    return context;
};
