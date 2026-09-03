/// <reference types="vitest/globals" />
/// <reference types="@testing-library/jest-dom" />
// 讓 tsc 認得 vitest 的全域（describe/it/expect）與 jest-dom 的 matcher
// （toBeInTheDocument / toHaveAttribute）。這兩者只在測試檔用得到，
// 但 Next.js 的型別檢查會掃整個 src/，不宣告就會報 TS2339。
