import { useMemo, useReducer } from 'react';

//FieldNames用于获取一个类型T中的所有字符串字段名。
export type FieldNames<T> = {
  [K in keyof T]: T[K] extends string ? K : K;
}[keyof T];

//ActionType用于定义一个redux action的类型
export type ActionType<T> =
  | { type: 'reset' }
  | { type?: 'change'; field: FieldNames<T>; value: any };

// Returns a typed dispatch and state
export const useCreateReducer = <T>({ initialState }: { initialState: T }) => {
  type Action =
    | { type: 'reset' }
    | { type?: 'change'; field: FieldNames<T>; value: any };

  const reducer = (state: T, action: Action) => {
    if (!action.type) return { ...state, [action.field]: action.value };

    if (action.type === 'reset') return initialState;

    throw new Error();
  };

  const [state, dispatch] = useReducer(reducer, initialState);
  // todo 这行代码使用useMemo似乎是不必要的
  return useMemo(() => ({ state, dispatch }), [state, dispatch]);
};
