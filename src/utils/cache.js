/**
 * Простой in-memory кэш с TTL
 */

import { config } from '../config/index.js';

class Cache {
  constructor() {
    this.store = new Map();
    this.enabled = config.cache.enabled;
  }

  /**
   * Получить значение из кэша
   * @param {string} key - Ключ
   * @returns {any|null}
   */
  get(key) {
    if (!this.enabled) return null;
    
    const item = this.store.get(key);
    if (!item) return null;
    
    // Проверяем TTL
    if (Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    
    return item.value;
  }

  /**
   * Сохранить значение в кэш
   * @param {string} key - Ключ
   * @param {any} value - Значение
   * @param {number} ttl - TTL в миллисекундах (по умолчанию из config)
   */
  set(key, value, ttl = config.cache.ttl) {
    if (!this.enabled) return;
    
    // Ограничение размера кэша
    if (this.store.size >= config.cache.maxSize) {
      // Удаляем самый старый элемент
      const firstKey = this.store.keys().next().value;
      this.store.delete(firstKey);
    }
    
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    });
  }

  /**
   * Удалить значение из кэша
   * @param {string} key - Ключ
   */
  delete(key) {
    this.store.delete(key);
  }

  /**
   * Очистить весь кэш
   */
  clear() {
    this.store.clear();
  }

  /**
   * Очистить истекшие записи
   */
  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.store.entries()) {
      if (now > item.expiresAt) {
        this.store.delete(key);
      }
    }
  }
}

// Экспортируем singleton
export const cache = new Cache();

// Очистка истекших записей каждые 5 минут
setInterval(() => cache.cleanup(), 5 * 60 * 1000);

export default cache;

