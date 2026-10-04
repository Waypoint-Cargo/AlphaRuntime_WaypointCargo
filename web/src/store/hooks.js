import {
   useDispatch,
   useSelector,
} from "react-redux";

// dispatch actions
export const useAppDispatch = () => useDispatch();

// read state from the store
export const useAppSelector = useSelector;
