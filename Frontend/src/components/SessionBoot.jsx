import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchMe } from "../store/authSlice";

export default function SessionBoot() {
  const dispatch = useDispatch();
  const ready = useSelector((s) => s.auth.ready);
  useEffect(() => {
    if (!ready) dispatch(fetchMe());
  }, [dispatch, ready]);
  return null;
}
