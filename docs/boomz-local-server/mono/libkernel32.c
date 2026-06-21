/*
 * Stub for the Windows kernel32 functions the DDTank servers P/Invoke.
 *
 * The Road server's console loop calls SetConsoleCtrlHandler (kernel32.dll) on
 * every REPL iteration to trap Ctrl+C. On Linux/Mono there is no kernel32, so
 * the call throws EntryPointNotFoundException and the server crash-loops.
 *
 * Build a no-op shared library and point Mono at it with a dllmap (see
 * dllmap.config). The stub simply reports success so the server keeps running.
 *
 * Build:
 *   gcc -shared -fPIC -o /usr/lib/libkernel32.so libkernel32.c
 */

/* BOOL SetConsoleCtrlHandler(PHANDLER_ROUTINE HandlerRoutine, BOOL Add) */
int SetConsoleCtrlHandler(void *HandlerRoutine, int Add)
{
    (void)HandlerRoutine;
    (void)Add;
    return 1; /* TRUE */
}
