from typing import Dict, Type, List, Any, Optional
from python_engine.strategy.base import BaseStrategy
from python_engine.core.logger import logger

class StrategyRegistry:
    _registry: Dict[str, Type[BaseStrategy]] = {}
    _active_instances: Dict[str, BaseStrategy] = {}
    _weights: Dict[str, float] = {}

    @classmethod
    def register(cls, strategy_id: str):
        def decorator(subclass: Type[BaseStrategy]):
            cls._registry[strategy_id] = subclass
            logger.info(f"[Strategy Registry] Registered strategy: {strategy_id} -> {subclass.__name__}")
            return subclass
        return decorator

    @classmethod
    def initialize_active_strategies(cls, db_strategies: List[Dict[str, Any]]):
        """
        Neon DB의 `quant_strategies` 상태를 기반으로 활성 인스턴스 초기화 및 동적 리로드
        """
        cls._active_instances.clear()
        cls._weights.clear()

        for item in db_strategies:
            strat_id = item.get("id")
            enabled = item.get("enabled", False)
            weight = float(item.get("allocation_weight", 0.2))

            if enabled and strat_id not in cls._registry:
                # DB에서는 켜져 있지만 워커 코드에 없음 → 구버전 워커 실행 중. 재시작 필요.
                logger.warning(
                    f"[Strategy Registry] '{strat_id}' is ENABLED in DB but not registered "
                    f"in this worker (known: {sorted(cls._registry)}). "
                    f"워커를 재시작(끄기→켜기)하여 최신 코드를 로드하세요."
                )
                continue

            if enabled and strat_id in cls._registry:
                strategy_cls = cls._registry[strat_id]
                instance = strategy_cls(
                    strategy_id=strat_id,
                    name=item.get("name", strat_id),
                    params=item.get("parameters", {}),
                )
                cls._active_instances[strat_id] = instance
                cls._weights[strat_id] = weight
                logger.info(f"[Strategy Registry] Activated strategy: {strat_id} (Weight: {weight})")

    @classmethod
    def get_active_strategies(cls) -> Dict[str, BaseStrategy]:
        return dict(cls._active_instances)

    @classmethod
    def get_strategy_weights(cls) -> Dict[str, float]:
        return dict(cls._weights)

    @classmethod
    def update_strategy_in_memory(cls, strategy_id: str, params: Optional[Dict[str, Any]] = None, enabled: Optional[bool] = None, weight: Optional[float] = None):
        """
        Zero-downtime hot-reload of running strategy instance parameters
        """
        if enabled is False and strategy_id in cls._active_instances:
            del cls._active_instances[strategy_id]
            cls._weights.pop(strategy_id, None)
            logger.info(f"[Strategy Registry] Deactivated strategy: {strategy_id}")
            return

        if enabled is True and strategy_id not in cls._active_instances and strategy_id in cls._registry:
            strategy_cls = cls._registry[strategy_id]
            instance = strategy_cls(
                strategy_id=strategy_id,
                name=strategy_id,
                params=params or {},
            )
            cls._active_instances[strategy_id] = instance
            cls._weights[strategy_id] = weight or 0.2
            logger.info(f"[Strategy Registry] Dynamically loaded & activated strategy: {strategy_id}")
            return

        if strategy_id in cls._active_instances:
            instance = cls._active_instances[strategy_id]
            if params:
                instance.update_params(params)
                logger.info(f"[Strategy Registry] Hot-updated params for strategy: {strategy_id}")
            if weight is not None:
                cls._weights[strategy_id] = weight
