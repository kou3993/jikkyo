import { useEffect } from "react";

const useDebounce = <T>(value: T, delay: number, cb: (value: T) => void) => {
  useEffect(() => {
    const handler = setTimeout(() => {
      cb(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay, cb]);
};

export default useDebounce;
