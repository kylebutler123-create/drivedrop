'use client';

import {createContext} from 'react';

/** Both account presentations open the same editor and preserve its draft. */
export const AccountEditorContext = createContext<{editing: boolean; setEditing: (editing: boolean) => void} | null>(null);
