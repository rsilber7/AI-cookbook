from app.rate_limit import SlidingWindow


def test_allows_up_to_the_limit_then_blocks():
    window = SlidingWindow(limit=2, seconds=60)
    for now in (0, 1):
        assert window.wait_time("a", now) == 0
        window.record("a", now)
    assert window.wait_time("a", 2) == 58  # oldest hit (t=0) frees up at t=60


def test_old_hits_expire():
    window = SlidingWindow(limit=1, seconds=60)
    window.record("a", 0)
    assert window.wait_time("a", 59) > 0
    assert window.wait_time("a", 60) == 0


def test_users_are_counted_separately():
    window = SlidingWindow(limit=1, seconds=60)
    window.record("a", 0)
    assert window.wait_time("b", 0) == 0
