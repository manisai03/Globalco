package com.globalco.jobboard.common.event;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Declarables;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.support.converter.DefaultJackson2JavaTypeMapper;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.ArrayList;
import java.util.List;

@Configuration
public class MessagingConfig {

    @Bean
    public TopicExchange eventsExchange() {
        return new TopicExchange(EventTopics.EXCHANGE, true, false);
    }

    @Bean
    public TopicExchange deadLetterExchange() {
        return new TopicExchange(EventTopics.DEAD_LETTER_EXCHANGE, true, false);
    }

    @Bean
    public MessageConverter jsonMessageConverter(ObjectMapper objectMapper) {
        Jackson2JsonMessageConverter converter = new Jackson2JsonMessageConverter(objectMapper);
        DefaultJackson2JavaTypeMapper typeMapper = new DefaultJackson2JavaTypeMapper();
        typeMapper.setTrustedPackages("com.globalco.jobboard.common.event");
        converter.setJavaTypeMapper(typeMapper);
        return converter;
    }

    /**
     * Declares a durable consumer queue bound to the given routing keys, plus a dead-letter queue
     * that receives messages whose handler keeps failing.
     */
    public static Declarables consumerQueue(String queueName, String... routingKeys) {
        TopicExchange exchange = new TopicExchange(EventTopics.EXCHANGE, true, false);
        TopicExchange dlx = new TopicExchange(EventTopics.DEAD_LETTER_EXCHANGE, true, false);
        Queue queue = QueueBuilder.durable(queueName)
                .withArgument("x-dead-letter-exchange", EventTopics.DEAD_LETTER_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", queueName)
                .build();
        Queue dlq = QueueBuilder.durable(queueName + ".dlq").build();

        List<org.springframework.amqp.core.Declarable> declarables = new ArrayList<>();
        declarables.add(queue);
        declarables.add(dlq);
        declarables.add(BindingBuilder.bind(dlq).to(dlx).with(queueName));
        for (String key : routingKeys) {
            Binding binding = BindingBuilder.bind(queue).to(exchange).with(key);
            declarables.add(binding);
        }
        return new Declarables(declarables);
    }
}
