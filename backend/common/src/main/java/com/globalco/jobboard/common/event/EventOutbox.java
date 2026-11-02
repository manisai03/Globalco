package com.globalco.jobboard.common.event;

/**
 * Durable store for outgoing events. {@link #store} joins the caller's database transaction, so an event
 * exists if and only if the business change committed; a relay then publishes it to RabbitMQ.
 */
public interface EventOutbox {

    void store(String routingKey, Object event);

    /** Publishes pending events soon, without waiting for the next scheduled poll. */
    void flushAsync();
}
