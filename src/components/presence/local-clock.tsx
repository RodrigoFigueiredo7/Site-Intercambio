"use client";

import { useEffect, useState } from "react";

import { localTime } from "@/lib/tz";

/**
 * The clock in the city the person is in. It starts from the value the server
 * rendered — so hydration matches — and then keeps itself honest every half
 * minute, which matters on a page somebody leaves open all evening.
 */
export function LocalClock({ tz, initial }: { tz: string; initial: string }) {
  const [time, setTime] = useState(initial);

  useEffect(() => {
    const tick = () => setTime(localTime(new Date().toISOString(), tz));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [tz]);

  return <>{time}</>;
}
